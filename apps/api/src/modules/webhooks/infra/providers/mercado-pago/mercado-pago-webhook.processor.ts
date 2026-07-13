import { Injectable, Logger } from '@nestjs/common';
import { WebhookProcessingStatus } from '@prisma/client';
import { PrismaService } from '../../../../../database/prisma/prisma.service';
import { NormalizedWebhookEvent } from '../../../domain/interfaces/provider-webhook-adapter.interface';
import {
  WebhookEventProcessor,
  WebhookProcessingResult,
} from '../../../domain/interfaces/webhook-event-processor.interface';

@Injectable()
export class MercadoPagoWebhookProcessor implements WebhookEventProcessor {
  private readonly logger = new Logger(MercadoPagoWebhookProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(event: NormalizedWebhookEvent): Promise<WebhookProcessingResult> {
    this.logger.log(`Mercado Pago webhook stored for MP-3 status sync: ${event.providerEventId}`);

    const updated = await this.prisma.webhookInboxEvent.updateMany({
      where: {
        provider: event.provider,
        providerEventId: event.providerEventId,
        status: { in: [WebhookProcessingStatus.RECEIVED, WebhookProcessingStatus.PROCESSING] },
      },
      data: {
        status: WebhookProcessingStatus.IGNORED,
        processedAt: new Date(),
        failureReason: 'Mercado Pago status sync will be handled in MP-3.',
      },
    });

    return {
      status: 'IGNORED',
      reason:
        updated.count > 0
          ? 'Mercado Pago status sync will be handled in MP-3.'
          : 'Mercado Pago webhook already processed.',
    };
  }
}
