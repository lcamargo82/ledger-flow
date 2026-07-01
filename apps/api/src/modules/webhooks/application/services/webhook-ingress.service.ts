import { Injectable, Logger, Inject } from '@nestjs/common';
import { WebhookProvider, Payment } from '@prisma/client';
import { WebhookAdapterRegistryService } from './webhook-adapter-registry.service';
import { WebhookProcessorRegistryService } from './webhook-processor-registry.service';
import type { IWebhookInboxRepository } from '../../domain/interfaces/webhook-inbox.repository';
import {
  ProviderWebhookAuthenticationInput,
  ProviderWebhookPayloadInput,
} from '../../domain/interfaces/provider-webhook-adapter.interface';
import { PrismaService } from '../../../../database/prisma/prisma.service';

@Injectable()
export class WebhookIngressService {
  private readonly logger = new Logger(WebhookIngressService.name);

  constructor(
    private readonly adapterRegistry: WebhookAdapterRegistryService,
    private readonly processorRegistry: WebhookProcessorRegistryService,
    @Inject('IWebhookInboxRepository')
    private readonly inboxRepository: IWebhookInboxRepository,
    private readonly prisma: PrismaService,
  ) {}

  async handleWebhook(
    provider: WebhookProvider,
    authInput: ProviderWebhookAuthenticationInput,
    payloadInput: ProviderWebhookPayloadInput,
  ): Promise<void> {
    const adapter = this.adapterRegistry.getAdapter(provider);

    await adapter.authenticate(authInput);
    this.logger.log(
      `[WebhookIngressService] webhook.ingress.authenticated provider=${provider}`,
    );

    const normalizedEvent = await adapter.normalize(payloadInput);
    this.logger.log(
      `[WebhookIngressService] webhook.ingress.normalized provider=${provider} eventId=${normalizedEvent.providerEventId}`,
    );

    const existing = await this.inboxRepository.findByProviderEventId(
      normalizedEvent.provider,
      normalizedEvent.providerEventId,
    );

    if (existing) {
      this.logger.log(
        `[WebhookIngressService] webhook.ingress.duplicate provider=${normalizedEvent.provider} eventId=${normalizedEvent.providerEventId}`,
      );
      return;
    }

    if (normalizedEvent.isInvalid) {
      this.logger.warn(
        `[WebhookIngressService] Webhook payload invalid for event ${normalizedEvent.providerEventId}: ${normalizedEvent.invalidReason}`,
      );
      const inboxEvent = await this.inboxRepository.createInvalid(
        {
          provider: normalizedEvent.provider,
          providerEventId: normalizedEvent.providerEventId,
          eventType: normalizedEvent.rawProviderEventType,
          providerPaymentId: normalizedEvent.providerPaymentId,
          externalReference: normalizedEvent.paymentReference,
          providerPaymentStatus: normalizedEvent.providerStatus,
          payloadHash: normalizedEvent.payloadHash,
          payloadSummary: normalizedEvent.payloadSummary,
        },
        normalizedEvent.invalidReason ?? 'Invalid payload structure',
      );
      this.logger.log(
        `[WebhookIngressService] webhook.ingress.invalid id=${inboxEvent.id}`,
      );
      return;
    }

    let tenantId: string | undefined;
    let paymentId: string | undefined;

    if (normalizedEvent.providerPaymentId || normalizedEvent.paymentReference) {
      let payment: Payment | null = null;
      if (normalizedEvent.providerPaymentId) {
        payment = await this.prisma.payment.findFirst({
          where: {
            provider: normalizedEvent.provider,
            providerPaymentId: normalizedEvent.providerPaymentId,
          },
        });
      }
      if (!payment && normalizedEvent.paymentReference) {
        payment = await this.prisma.payment.findFirst({
          where: {
            reference: normalizedEvent.paymentReference,
          },
        });
      }

      if (payment) {
        tenantId = payment.tenantId;
        paymentId = payment.id;
      } else {
        this.logger.warn(
          `[WebhookIngressService] Payment not found for event ${normalizedEvent.providerEventId}, matching failed.`,
        );
        const inboxEvent = await this.inboxRepository.createUnmatched(
          {
            provider: normalizedEvent.provider,
            providerEventId: normalizedEvent.providerEventId,
            eventType: normalizedEvent.rawProviderEventType,
            providerPaymentId: normalizedEvent.providerPaymentId,
            externalReference: normalizedEvent.paymentReference,
            providerPaymentStatus: normalizedEvent.providerStatus,
            payloadHash: normalizedEvent.payloadHash,
            payloadSummary: normalizedEvent.payloadSummary,
          },
          'Payment not found locally',
        );
        this.logger.log(
          `[WebhookIngressService] webhook.ingress.unmatched id=${inboxEvent.id}`,
        );
        return;
      }
    }

    const inboxEvent = await this.inboxRepository.createReceived({
      provider: normalizedEvent.provider,
      providerEventId: normalizedEvent.providerEventId,
      eventType: normalizedEvent.rawProviderEventType,
      providerPaymentId: normalizedEvent.providerPaymentId,
      externalReference: normalizedEvent.paymentReference,
      providerPaymentStatus: normalizedEvent.providerStatus,
      payloadHash: normalizedEvent.payloadHash,
      payloadSummary: normalizedEvent.payloadSummary,
      tenantId,
      paymentId,
    });
    this.logger.log(
      `[WebhookIngressService] webhook.ingress.received id=${inboxEvent.id}`,
    );

    // Asynchronous processing enabled (Phase 8A)
    // The processor will be invoked by the worker via RabbitMQ and Outbox.
    this.logger.log(
      `[WebhookIngressService] webhook.ingress.queued eventId=${normalizedEvent.providerEventId}`,
    );
    return;
  }
}
