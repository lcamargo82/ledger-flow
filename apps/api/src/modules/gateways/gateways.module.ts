import { OnModuleInit } from '@nestjs/common';
import { AsyncModule } from '../async/async.module';
import { AuthModule } from '../auth/auth.module';

import { AsyncHandlerRegistryService } from '../async/application/services/async-handler-registry.service';
import { AsaasCreateChargeAsyncHandler } from './application/async-handlers/asaas-create-charge.handler';
import { Module } from '@nestjs/common';
import { PaymentGatewayFactoryService } from './application/services/payment-gateway-factory.service';
import { PaymentGatewayResolverService } from './application/services/payment-gateway-resolver.service';
import { GatewayConfigurationsRepository } from './domain/repositories/gateway-configurations.repository';
import { PrismaGatewayConfigurationsRepository } from './infra/repositories/prisma-gateway-configurations.repository';
import { StripePaymentGatewayAdapter } from './infra/adapters/stripe-payment-gateway.adapter';
import { AsaasPaymentGatewayAdapter } from './infra/adapters/asaas-payment-gateway.adapter';
import { MercadoPagoPaymentGatewayAdapter } from './infra/providers/mercado-pago/mercado-pago-payment-gateway.adapter';
import { PagBankPaymentGatewayAdapter } from './infra/adapters/pagbank-payment-gateway.adapter';
import { PagarmePaymentGatewayAdapter } from './infra/adapters/pagarme-payment-gateway.adapter';
import { GatewayCredentialsEncryptionService } from './application/services/gateway-credentials-encryption.service';
import { Aes256GcmCredentialsEncryptionService } from './infra/crypto/aes-256-gcm-credentials-encryption.service';
import { IProviderCustomerReferenceRepository } from './domain/interfaces/provider-customer-reference.repository';
import { PrismaGatewayCustomerReferenceRepository } from './infra/repositories/prisma-gateway-customer-reference.repository';
import { AsaasApiClient } from './infra/clients/asaas-api.client';
import { GatewayCustomerSyncService } from './application/services/gateway-customer-sync.service';
import { GatewayPaymentOrchestrationService } from './application/services/gateway-payment-orchestration.service';
import { MercadoPagoApiClient } from './infra/providers/mercado-pago/mercado-pago-api.client';
import { MercadoPagoOAuthStateService } from './infra/providers/mercado-pago/mercado-pago-oauth-state.service';
import { MercadoPagoOAuthService } from './infra/providers/mercado-pago/mercado-pago-oauth.service';
import { MercadoPagoOAuthController } from './presentation/controllers/mercado-pago-oauth.controller';

import { MercadoPagoCreateChargeAsyncHandler } from './application/async-handlers/mercado-pago-create-charge.async-handler';

@Module({
  imports: [AsyncModule, AuthModule],
  controllers: [
    MercadoPagoOAuthController,
  ],
  providers: [
    AsaasCreateChargeAsyncHandler,
    MercadoPagoCreateChargeAsyncHandler,
    {
      provide: GatewayConfigurationsRepository,
      useClass: PrismaGatewayConfigurationsRepository,
    },
    {
      provide: GatewayCredentialsEncryptionService,
      useClass: Aes256GcmCredentialsEncryptionService,
    },
    {
      provide: IProviderCustomerReferenceRepository,
      useClass: PrismaGatewayCustomerReferenceRepository,
    },
    AsaasApiClient,
    MercadoPagoApiClient,
    GatewayCustomerSyncService,
    GatewayPaymentOrchestrationService,
    PaymentGatewayFactoryService,
    PaymentGatewayResolverService,
    StripePaymentGatewayAdapter,
    AsaasPaymentGatewayAdapter,
    MercadoPagoPaymentGatewayAdapter,
    PagBankPaymentGatewayAdapter,
    PagarmePaymentGatewayAdapter,
    MercadoPagoOAuthStateService,
    MercadoPagoOAuthService,
  ],
  exports: [
    PaymentGatewayResolverService,
    GatewayCredentialsEncryptionService,
    GatewayPaymentOrchestrationService,
  ],
})
export class GatewaysModule implements OnModuleInit {
  constructor(
    private readonly registry: AsyncHandlerRegistryService,
    private readonly asaasCreateChargeHandler: AsaasCreateChargeAsyncHandler,
    private readonly mercadoPagoCreateChargeHandler: MercadoPagoCreateChargeAsyncHandler,
  ) {}

  onModuleInit() {
    this.registry.register(this.asaasCreateChargeHandler);
    this.registry.register(this.mercadoPagoCreateChargeHandler);
  }
}
