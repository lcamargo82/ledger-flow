import { Module } from '@nestjs/common';
import { PrismaWebhookInboxRepository } from './infra/repositories/prisma-webhook-inbox.repository';
import { WebhookIngressService } from './application/services/webhook-ingress.service';
import { PaymentWebhookSyncService } from './application/services/payment-webhook-sync.service';
import { AsaasWebhookProcessorService } from './application/services/asaas-webhook-processor.service';
import { AsaasWebhooksController } from './presentation/controllers/asaas-webhooks.controller';
import { PrismaService } from '../../database/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [AsaasWebhooksController],
  providers: [
    PrismaService,
    {
      provide: 'IWebhookInboxRepository',
      useClass: PrismaWebhookInboxRepository,
    },
    WebhookIngressService,
    PaymentWebhookSyncService,
    AsaasWebhookProcessorService,
  ],
})
export class WebhooksModule {}
