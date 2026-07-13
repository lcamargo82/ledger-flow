import { Injectable, Logger } from '@nestjs/common';
import { WebhookProcessingStatus } from '@prisma/client';
import { PrismaService } from '../../../../../database/prisma/prisma.service';
import { PaymentWebhookSyncService } from '../../../application/services/payment-webhook-sync.service';
import { NormalizedWebhookEvent } from '../../../domain/interfaces/provider-webhook-adapter.interface';
import {
  WebhookEventProcessor,
  WebhookProcessingResult,
} from '../../../domain/interfaces/webhook-event-processor.interface';

@Injectable()
export class MercadoPagoWebhookProcessor implements WebhookEventProcessor {
  private readonly logger = new Logger(MercadoPagoWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentSyncService: PaymentWebhookSyncService,
  ) {}

  async process(event: NormalizedWebhookEvent): Promise<WebhookProcessingResult> {
    this.logger.log(`Processing Mercado Pago webhook ${event.providerEventId}`);

    const result = await this.paymentSyncService.syncMercadoPagoPayment(event);
    const finalStatus =
      result.status === WebhookProcessingStatus.PROCESSED
        ? WebhookProcessingStatus.PROCESSED
        : WebhookProcessingStatus.IGNORED;

    await this.prisma.webhookInboxEvent.updateMany({
      where: { provider: event.provider, providerEventId: event.providerEventId },
      data: {
        status: finalStatus,
        processedAt: new Date(),
        failureReason: result.reason,
        paymentId: result.paymentId,
        tenantId: result.tenantId,
        gatewayConfigurationId: result.gatewayConfigurationId,
      },
    });

    return {
      status: finalStatus === WebhookProcessingStatus.PROCESSED ? 'PROCESSED' : 'IGNORED',
      reason: result.reason,
      paymentId: result.paymentId,
      tenantId: result.tenantId,
      previousStatus: result.previousStatus,
      currentStatus: result.currentStatus,
    };
  }
}
