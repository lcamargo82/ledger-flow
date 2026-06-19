import { Injectable, Inject, Logger } from '@nestjs/common';
import { WebhookProvider, WebhookProcessingStatus } from '@prisma/client';
import * as crypto from 'crypto';
import type { IWebhookInboxRepository } from '../../domain/interfaces/webhook-inbox.repository';
import { AsaasWebhookEventDto } from '../dto/asaas-webhook-event.dto';
import { PaymentWebhookSyncService } from './payment-webhook-sync.service';

@Injectable()
export class AsaasWebhookProcessorService {
  private readonly logger = new Logger(AsaasWebhookProcessorService.name);

  constructor(
    @Inject('IWebhookInboxRepository')
    private readonly inboxRepository: IWebhookInboxRepository,
    private readonly paymentSyncService: PaymentWebhookSyncService,
  ) {}

  async processEvent(payload: AsaasWebhookEventDto): Promise<void> {
    const providerEventId = payload.id;
    const provider = WebhookProvider.ASAAS;

    this.logger.log(
      `[AsaasWebhookProcessorService] Receiving Asaas event ${providerEventId}`,
    );

    // Idempotency check
    const existing = await this.inboxRepository.findByProviderEventId(
      provider,
      providerEventId,
    );
    if (existing) {
      this.logger.log(
        `[AsaasWebhookProcessorService] Event ${providerEventId} is a duplicate. Ignored.`,
      );
      return; // Return 200 via controller naturally
    }

    // Sanitize payload summary
    const payloadSummary = {
      eventId: payload.id,
      eventType: payload.event,
      providerPaymentId: payload.payment?.id,
      externalReference: payload.payment?.externalReference,
      providerStatus: payload.payment?.status,
      billingType: payload.payment?.billingType,
      value: payload.payment?.value,
      eventDate: payload.dateCreated,
    };

    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payloadSummary))
      .digest('hex');

    // Create Inbox Event
    const inboxEvent = await this.inboxRepository.createReceived({
      provider,
      providerEventId,
      eventType: payload.event,
      payloadHash,
      payloadSummary,
    });

    try {
      await this.inboxRepository.markProcessing(inboxEvent.id);

      const result = await this.paymentSyncService.syncAsaasPayment(payload);

      if (result.status === WebhookProcessingStatus.IGNORED) {
        await this.inboxRepository.markIgnored(
          inboxEvent.id,
          result.reason,
          result.paymentId,
          result.gatewayConfigurationId,
          result.tenantId,
        );
        this.logger.log(
          `[AsaasWebhookProcessorService] Event ${providerEventId} ignored: ${result.reason}`,
        );
      } else {
        await this.inboxRepository.markProcessed(
          inboxEvent.id,
          result.paymentId,
          result.gatewayConfigurationId,
          result.tenantId,
        );
        this.logger.log(
          `[AsaasWebhookProcessorService] Event ${providerEventId} processed successfully.`,
        );
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `[AsaasWebhookProcessorService] Failed to process event ${providerEventId}: ${err.message}`,
      );
      await this.inboxRepository.markFailed(inboxEvent.id, err.message);
      // We throw to return 500 so Asaas retries later
      throw err;
    }
  }
}
