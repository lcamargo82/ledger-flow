import { AsyncModule } from '../async/async.module';
import { AsyncHandlerRegistryService } from '../async/application/services/async-handler-registry.service';
import { AsaasWebhookProcessingAsyncHandler } from './application/async-handlers/asaas-webhook-processing.handler';
import { Module, OnModuleInit } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import { GatewaysModule } from '../gateways/gateways.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { PrismaWebhookInboxRepository } from './infra/repositories/prisma-webhook-inbox.repository';
import { WebhookIngressService } from './application/services/webhook-ingress.service';
import { PaymentWebhookSyncService } from './application/services/payment-webhook-sync.service';
import { AsaasWebhooksController } from './presentation/controllers/asaas-webhooks.controller';
import { MercadoPagoWebhooksController } from './presentation/controllers/mercado-pago-webhooks.controller';
import { PrismaService } from '../../database/prisma/prisma.service';

import { WebhookAdapterRegistryService } from './application/services/webhook-adapter-registry.service';
import { WebhookProcessorRegistryService } from './application/services/webhook-processor-registry.service';

import { AsaasWebhookAuthenticator } from './infra/providers/asaas/asaas-webhook-authenticator';
import { AsaasWebhookNormalizer } from './infra/providers/asaas/asaas-webhook-normalizer';
import { AsaasWebhookAdapter } from './infra/providers/asaas/asaas-webhook.adapter';
import { AsaasPaymentWebhookProcessor } from './infra/providers/asaas/asaas-payment-webhook.processor';

import { StripeWebhookAdapter } from './infra/providers/stripe/stripe-webhook.adapter';
import { MercadoPagoWebhookAdapter } from './infra/providers/mercado-pago/mercado-pago-webhook.adapter';
import { MercadoPagoWebhookAuthenticator } from './infra/providers/mercado-pago/mercado-pago-webhook-authenticator';
import { MercadoPagoWebhookNormalizer } from './infra/providers/mercado-pago/mercado-pago-webhook-normalizer';
import { MercadoPagoWebhookProcessor } from './infra/providers/mercado-pago/mercado-pago-webhook.processor';
import { PagBankWebhookAdapter } from './infra/providers/pagbank/pagbank-webhook.adapter';
import { PagarmeWebhookAdapter } from './infra/providers/pagarme/pagarme-webhook.adapter';

@Module({
  imports: [AsyncModule, GatewaysModule, NotificationsModule, ReconciliationModule],
  controllers: [AsaasWebhooksController, MercadoPagoWebhooksController],
  providers: [
    AsaasWebhookProcessingAsyncHandler,
    PrismaService,
    {
      provide: 'IWebhookInboxRepository',
      useClass: PrismaWebhookInboxRepository,
    },
    WebhookAdapterRegistryService,
    WebhookProcessorRegistryService,
    WebhookIngressService,
    PaymentWebhookSyncService,

    AsaasWebhookAuthenticator,
    AsaasWebhookNormalizer,
    AsaasWebhookAdapter,
    AsaasPaymentWebhookProcessor,

    StripeWebhookAdapter,
    MercadoPagoWebhookAuthenticator,
    MercadoPagoWebhookNormalizer,
    MercadoPagoWebhookAdapter,
    MercadoPagoWebhookProcessor,
    PagBankWebhookAdapter,
    PagarmeWebhookAdapter,
  ],
})
export class WebhooksModule implements OnModuleInit {
  constructor(
    private readonly asyncHandlerRegistry: AsyncHandlerRegistryService,
    private readonly asaasWebhookHandler: AsaasWebhookProcessingAsyncHandler,

    private readonly adapterRegistry: WebhookAdapterRegistryService,
    private readonly processorRegistry: WebhookProcessorRegistryService,

    private readonly asaasAdapter: AsaasWebhookAdapter,
    private readonly stripeAdapter: StripeWebhookAdapter,
    private readonly mercadoPagoAdapter: MercadoPagoWebhookAdapter,
    private readonly pagBankAdapter: PagBankWebhookAdapter,
    private readonly pagarmeAdapter: PagarmeWebhookAdapter,

    private readonly asaasProcessor: AsaasPaymentWebhookProcessor,
    private readonly mercadoPagoProcessor: MercadoPagoWebhookProcessor,
  ) {}

  onModuleInit() {
    this.asyncHandlerRegistry.register(this.asaasWebhookHandler);

    this.adapterRegistry.register(WebhookProvider.ASAAS, this.asaasAdapter);
    this.adapterRegistry.register(WebhookProvider.STRIPE, this.stripeAdapter);
    this.adapterRegistry.register(WebhookProvider.MERCADO_PAGO, this.mercadoPagoAdapter);
    this.adapterRegistry.register(WebhookProvider.PAGBANK, this.pagBankAdapter);
    this.adapterRegistry.register(WebhookProvider.PAGARME, this.pagarmeAdapter);

    this.processorRegistry.register(WebhookProvider.ASAAS, this.asaasProcessor);
    this.processorRegistry.register(WebhookProvider.MERCADO_PAGO, this.mercadoPagoProcessor);
  }
}
