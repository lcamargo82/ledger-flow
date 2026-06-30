import { OnModuleInit } from '@nestjs/common';
import { AsyncModule } from '../async/async.module';
import { AsyncHandlerRegistryService } from '../async/application/services/async-handler-registry.service';
import { AsaasCreateChargeAsyncHandler } from './application/async-handlers/asaas-create-charge.handler';
import { Module } from '@nestjs/common';
import { PaymentGatewayFactoryService } from './application/services/payment-gateway-factory.service';
import { PaymentGatewayResolverService } from './application/services/payment-gateway-resolver.service';
import { GatewayConfigurationsRepository } from './domain/repositories/gateway-configurations.repository';
import { PrismaGatewayConfigurationsRepository } from './infra/repositories/prisma-gateway-configurations.repository';
import { StripePaymentGatewayAdapter } from './infra/adapters/stripe-payment-gateway.adapter';
import { AsaasPaymentGatewayAdapter } from './infra/adapters/asaas-payment-gateway.adapter';
import { MercadoPagoPaymentGatewayAdapter } from './infra/adapters/mercado-pago-payment-gateway.adapter';
import { PagBankPaymentGatewayAdapter } from './infra/adapters/pagbank-payment-gateway.adapter';
import { PagarmePaymentGatewayAdapter } from './infra/adapters/pagarme-payment-gateway.adapter';
import { GatewayCredentialsEncryptionService } from './application/services/gateway-credentials-encryption.service';
import { Aes256GcmCredentialsEncryptionService } from './infra/crypto/aes-256-gcm-credentials-encryption.service';
import { GatewayConnectionsService } from './application/services/gateway-connections.service';
import { GatewayConnectionsController } from './presentation/controllers/gateway-connections.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { IProviderCustomerReferenceRepository } from './domain/interfaces/provider-customer-reference.repository';
import { PrismaGatewayCustomerReferenceRepository } from './infra/repositories/prisma-gateway-customer-reference.repository';
import { AsaasApiClient } from './infra/clients/asaas-api.client';
import { GatewayCustomerSyncService } from './application/services/gateway-customer-sync.service';
import { GatewayPaymentOrchestrationService } from './application/services/gateway-payment-orchestration.service';

@Module({
  imports: [AsyncModule, TenantsModule],
  controllers: [GatewayConnectionsController],
  providers: [
    AsaasCreateChargeAsyncHandler,
    GatewayConnectionsService,
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
    GatewayCustomerSyncService,
    GatewayPaymentOrchestrationService,
    PaymentGatewayFactoryService,
    PaymentGatewayResolverService,
    StripePaymentGatewayAdapter,
    AsaasPaymentGatewayAdapter,
    MercadoPagoPaymentGatewayAdapter,
    PagBankPaymentGatewayAdapter,
    PagarmePaymentGatewayAdapter,
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
  ) {}

  onModuleInit() {
    this.registry.register(this.asaasCreateChargeHandler);
  }
}
