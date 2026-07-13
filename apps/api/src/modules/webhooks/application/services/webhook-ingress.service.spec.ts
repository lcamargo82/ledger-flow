import { PaymentProvider, WebhookProvider } from '@prisma/client';
import { WebhookIngressService } from './webhook-ingress.service';

describe('WebhookIngressService Mercado Pago tenant resolution', () => {
  it('resolves tenant and gateway configuration from Mercado Pago merchant id fingerprint', async () => {
    const adapter = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      normalize: jest.fn().mockResolvedValue({
        provider: WebhookProvider.MERCADO_PAGO,
        providerEventId: 'evt-1',
        eventType: 'payment',
        rawProviderEventType: 'payment',
        providerPaymentId: undefined,
        paymentReference: undefined,
        providerStatus: 'payment.updated',
        payloadHash: 'hash-1',
        payloadSummary: { resourceId: 'payment-1' },
        metadata: { merchantId: '456' },
      }),
    };
    const adapterRegistry = { getAdapter: jest.fn().mockReturnValue(adapter) };
    const processorRegistry = { getProcessor: jest.fn() };
    const inboxRepository = {
      findByProviderEventId: jest.fn().mockResolvedValue(null),
      createReceived: jest.fn().mockResolvedValue({ id: 'inbox-1' }),
    };
    const prisma = {
      gatewayConfiguration: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'gateway-1',
          tenantId: 'tenant-1',
          provider: PaymentProvider.MERCADO_PAGO,
        }),
      },
    };
    const service = new WebhookIngressService(
      adapterRegistry as never,
      processorRegistry as never,
      inboxRepository as never,
      prisma as never,
    );

    await service.handleWebhook(
      WebhookProvider.MERCADO_PAGO,
      { headers: {} },
      {
        headers: {},
        payload: {},
        receivedAt: new Date(),
      },
    );

    expect(prisma.gatewayConfiguration.findFirst).toHaveBeenCalledWith({
      where: {
        provider: PaymentProvider.MERCADO_PAGO,
        credentialsFingerprint: 'mp_456',
      },
    });
    expect(inboxRepository.createReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        gatewayConfigurationId: 'gateway-1',
      }),
    );
  });
});
