import { MercadoPagoPaymentGatewayAdapter } from './mercado-pago-payment-gateway.adapter';

describe('MercadoPagoPaymentGatewayAdapter', () => {
  it('advertises only the capabilities implemented in the current foundation', () => {
    const adapter = new MercadoPagoPaymentGatewayAdapter({} as never);

    expect(adapter.getCapabilities()).toMatchObject({
      supportsPix: true,
      supportsBoleto: true,
      supportsCard: false,
      supportsBankTransfer: false,
      supportsRefund: true,
      supportsCancel: true,
      supportsPartialRefund: false,
      supportsWebhooks: true,
      supportsCheckoutRedirect: false,
      supportsEmbeddedCheckout: false,
    });
  });

  it('cancels Mercado Pago payment through the provider API', async () => {
    const apiClient = {
      cancelPayment: jest.fn().mockResolvedValue({
        id: 123,
        status: 'cancelled',
        status_detail: 'by_collector',
        transaction_amount: 100,
      }),
    };
    const adapter = new MercadoPagoPaymentGatewayAdapter(apiClient as never);

    const result = await adapter.cancelPayment({
      tenantId: 'tenant-1',
      paymentId: 'payment-1',
      providerPaymentId: '123',
      gatewayConfigurationId: 'gateway-1',
      environment: 'LIVE' as never,
      credentials: { accessToken: 'token' },
      idempotencyKey: 'cancel-key',
    });

    expect(apiClient.cancelPayment).toHaveBeenCalledWith('token', '123', 'cancel-key');
    expect(result).toMatchObject({
      providerPaymentId: '123',
      providerStatus: 'cancelled',
      normalizedStatus: 'CANCELED',
    });
  });

  it('refunds Mercado Pago payment through the provider API', async () => {
    const apiClient = {
      refundPayment: jest.fn().mockResolvedValue({
        id: 456,
        payment_id: 123,
        status: 'approved',
        amount: 100,
      }),
    };
    const adapter = new MercadoPagoPaymentGatewayAdapter(apiClient as never);

    const result = await adapter.refundPayment({
      tenantId: 'tenant-1',
      paymentId: 'payment-1',
      providerPaymentId: '123',
      gatewayConfigurationId: 'gateway-1',
      environment: 'LIVE' as never,
      credentials: { accessToken: 'token' },
      amount: 10000,
      idempotencyKey: 'refund-key',
    });

    expect(apiClient.refundPayment).toHaveBeenCalledWith('token', '123', {
      amount: 100,
      idempotencyKey: 'refund-key',
    });
    expect(result).toMatchObject({
      providerPaymentId: '123',
      providerStatus: 'approved',
      normalizedStatus: 'REFUNDED',
      metadata: expect.objectContaining({ refundId: '456' }),
    });
  });
});
