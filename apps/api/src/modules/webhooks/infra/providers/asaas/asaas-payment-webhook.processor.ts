import { Injectable, Logger } from '@nestjs/common';
import { WebhookProcessingStatus } from '@prisma/client';
import { NormalizedWebhookEvent } from '../../../domain/interfaces/provider-webhook-adapter.interface';
import {
  WebhookEventProcessor,
  WebhookProcessingResult,
} from '../../../domain/interfaces/webhook-event-processor.interface';
import { PaymentWebhookSyncService } from '../../../application/services/payment-webhook-sync.service';

@Injectable()
export class AsaasPaymentWebhookProcessor implements WebhookEventProcessor {
  private readonly logger = new Logger(AsaasPaymentWebhookProcessor.name);

  constructor(private readonly paymentSyncService: PaymentWebhookSyncService) {}

  async process(event: NormalizedWebhookEvent): Promise<WebhookProcessingResult> {
    this.logger.log(`[AsaasPaymentWebhookProcessor] Processing event ${event.providerEventId}`);

    const result = await this.paymentSyncService.syncAsaasPayment(event);

    return {
      status: result.status === WebhookProcessingStatus.IGNORED ? 'IGNORED' : 'PROCESSED',
      reason: result.reason,
      paymentId: result.paymentId,
      tenantId: result.tenantId,
      // Pass these if the sync service exposes them
      // previousStatus: result.previousStatus,
      // currentStatus: result.currentStatus,
    };
  }
}
