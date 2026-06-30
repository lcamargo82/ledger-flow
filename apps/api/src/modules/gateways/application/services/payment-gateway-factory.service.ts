import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { IPaymentGateway } from '../../domain/interfaces/payment-gateway.interface';
import { StripePaymentGatewayAdapter } from '../../infra/adapters/stripe-payment-gateway.adapter';
import { AsaasPaymentGatewayAdapter } from '../../infra/adapters/asaas-payment-gateway.adapter';
import { MercadoPagoPaymentGatewayAdapter } from '../../infra/providers/mercado-pago/mercado-pago-payment-gateway.adapter';
import { PagBankPaymentGatewayAdapter } from '../../infra/adapters/pagbank-payment-gateway.adapter';
import { PagarmePaymentGatewayAdapter } from '../../infra/adapters/pagarme-payment-gateway.adapter';
import { GatewayNotSupportedError } from '../../domain/errors/gateway-errors';

@Injectable()
export class PaymentGatewayFactoryService {
  constructor(
    private readonly stripeAdapter: StripePaymentGatewayAdapter,
    private readonly asaasAdapter: AsaasPaymentGatewayAdapter,
    private readonly mercadoPagoAdapter: MercadoPagoPaymentGatewayAdapter,
    private readonly pagBankAdapter: PagBankPaymentGatewayAdapter,
    private readonly pagarmeAdapter: PagarmePaymentGatewayAdapter,
  ) {}

  getAdapter(provider: PaymentProvider): IPaymentGateway {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return this.stripeAdapter;
      case PaymentProvider.ASAAS:
        return this.asaasAdapter;
      case PaymentProvider.MERCADO_PAGO:
        return this.mercadoPagoAdapter;
      case PaymentProvider.PAGBANK:
        return this.pagBankAdapter;
      case PaymentProvider.PAGARME:
        return this.pagarmeAdapter;
      default:
        throw new GatewayNotSupportedError(provider);
    }
  }
}
