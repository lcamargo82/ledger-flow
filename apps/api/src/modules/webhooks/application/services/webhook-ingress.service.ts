import { Injectable, Logger, Inject } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import { WebhookAdapterRegistryService } from './webhook-adapter-registry.service';
import { WebhookProcessorRegistryService } from './webhook-processor-registry.service';
import type { IWebhookInboxRepository } from '../../domain/interfaces/webhook-inbox.repository';
import {
  ProviderWebhookAuthenticationInput,
  ProviderWebhookPayloadInput,
} from '../../domain/interfaces/provider-webhook-adapter.interface';

@Injectable()
export class WebhookIngressService {
  private readonly logger = new Logger(WebhookIngressService.name);

  constructor(
    private readonly adapterRegistry: WebhookAdapterRegistryService,
    private readonly processorRegistry: WebhookProcessorRegistryService,
    @Inject('IWebhookInboxRepository')
    private readonly inboxRepository: IWebhookInboxRepository,
  ) {}

  async handleWebhook(
    provider: WebhookProvider,
    authInput: ProviderWebhookAuthenticationInput,
    payloadInput: ProviderWebhookPayloadInput,
  ): Promise<void> {
    const adapter = this.adapterRegistry.getAdapter(provider);

    await adapter.authenticate(authInput);
    this.logger.log(`[WebhookIngressService] webhook.ingress.authenticated provider=${provider}`);

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

    const inboxEvent = await this.inboxRepository.createReceived({
      provider: normalizedEvent.provider,
      providerEventId: normalizedEvent.providerEventId,
      eventType: normalizedEvent.rawProviderEventType,
      payloadHash: normalizedEvent.payloadHash,
      payloadSummary: normalizedEvent.payloadSummary,
    });
    this.logger.log(`[WebhookIngressService] webhook.ingress.received id=${inboxEvent.id}`);

    // Asynchronous processing enabled (Phase 8A)
    // The processor will be invoked by the worker via RabbitMQ and Outbox.
    this.logger.log(
      `[WebhookIngressService] webhook.ingress.queued eventId=${normalizedEvent.providerEventId}`,
    );
    return;
  }
}
