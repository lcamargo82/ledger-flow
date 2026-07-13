import { MercadoPagoPaymentGatewayAdapter } from './mercado-pago-payment-gateway.adapter';

describe('MercadoPagoPaymentGatewayAdapter', () => {
  it('advertises only the capabilities implemented in the current foundation', () => {
    const adapter = new MercadoPagoPaymentGatewayAdapter({} as never);

    expect(adapter.getCapabilities()).toMatchObject({
      supportsPix: true,
      supportsBoleto: true,
      supportsCard: false,
      supportsBankTransfer: false,
      supportsRefund: false,
      supportsCancel: false,
      supportsPartialRefund: false,
      supportsWebhooks: true,
      supportsCheckoutRedirect: false,
      supportsEmbeddedCheckout: false,
    });
  });
});
