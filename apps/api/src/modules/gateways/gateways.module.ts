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

@Module({
  providers: [
    {
      provide: GatewayConfigurationsRepository,
      useClass: PrismaGatewayConfigurationsRepository,
    },
    {
      provide: GatewayCredentialsEncryptionService,
      useClass: Aes256GcmCredentialsEncryptionService,
    },
    PaymentGatewayFactoryService,
    PaymentGatewayResolverService,
    StripePaymentGatewayAdapter,
    AsaasPaymentGatewayAdapter,
    MercadoPagoPaymentGatewayAdapter,
    PagBankPaymentGatewayAdapter,
    PagarmePaymentGatewayAdapter,
  ],
  exports: [PaymentGatewayResolverService, GatewayCredentialsEncryptionService],
})
export class GatewaysModule {}
