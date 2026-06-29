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

    if (!adapter.supportsEvent(normalizedEvent.rawProviderEventType)) {
      await this.inboxRepository.markIgnored(inboxEvent.id, 'Event type not supported');
      this.logger.log(
        `[WebhookIngressService] webhook.ingress.ignored eventId=${normalizedEvent.providerEventId} reason="Event type not supported"`,
      );
      return;
    }

    try {
      await this.inboxRepository.markProcessing(inboxEvent.id);
      this.logger.log(
        `[WebhookIngressService] webhook.ingress.processing_started eventId=${normalizedEvent.providerEventId}`,
      );

      const processor = this.processorRegistry.getProcessor(provider);

      const result = await processor.process(normalizedEvent);

      if (result.status === 'IGNORED') {
        await this.inboxRepository.markIgnored(
          inboxEvent.id,
          result.reason,
          result.paymentId,
          normalizedEvent.gatewayConfigurationId,
          result.tenantId,
        );
        this.logger.log(
          `[WebhookIngressService] webhook.ingress.ignored eventId=${normalizedEvent.providerEventId} reason=${result.reason}`,
        );
      } else {
        await this.inboxRepository.markProcessed(
          inboxEvent.id,
          result.paymentId,
          normalizedEvent.gatewayConfigurationId,
          result.tenantId,
        );
        this.logger.log(
          `[WebhookIngressService] webhook.ingress.processed eventId=${normalizedEvent.providerEventId}`,
        );
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `[WebhookIngressService] webhook.ingress.failed eventId=${normalizedEvent.providerEventId} error=${err.message}`,
      );
      await this.inboxRepository.markFailed(inboxEvent.id, err.message);
      throw err;
    }
  }
}
