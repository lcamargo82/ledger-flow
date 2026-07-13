import { PaymentStatus, WebhookProcessingStatus, WebhookProvider } from '@prisma/client';
import { MercadoPagoWebhookProcessor } from './mercado-pago-webhook.processor';

describe('MercadoPagoWebhookProcessor', () => {
  const prisma = {
    webhookInboxEvent: {
      updateMany: jest.fn(),
    },
  };
  const paymentSyncService = {
    syncMercadoPagoPayment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks the inbox event as processed after status sync', async () => {
    paymentSyncService.syncMercadoPagoPayment.mockResolvedValue({
      status: WebhookProcessingStatus.PROCESSED,
      paymentId: 'payment-1',
      tenantId: 'tenant-1',
      gatewayConfigurationId: 'gateway-1',
      previousStatus: PaymentStatus.PENDING,
      currentStatus: PaymentStatus.APPROVED,
    });

    const processor = new MercadoPagoWebhookProcessor(prisma as never, paymentSyncService as never);

    const result = await processor.process({
      provider: WebhookProvider.MERCADO_PAGO,
      providerEventId: 'mp-event-1',
      eventType: 'payment',
      rawProviderEventType: 'payment',
      providerPaymentId: '123',
      payloadHash: 'hash',
      payloadSummary: {},
    });

    expect(paymentSyncService.syncMercadoPagoPayment).toHaveBeenCalledWith(
      expect.objectContaining({ providerEventId: 'mp-event-1' }),
    );
    expect(prisma.webhookInboxEvent.updateMany).toHaveBeenCalledWith({
      where: { provider: WebhookProvider.MERCADO_PAGO, providerEventId: 'mp-event-1' },
      data: {
        status: WebhookProcessingStatus.PROCESSED,
        processedAt: expect.any(Date),
        failureReason: undefined,
        paymentId: 'payment-1',
        tenantId: 'tenant-1',
        gatewayConfigurationId: 'gateway-1',
      },
    });
    expect(result).toMatchObject({
      status: 'PROCESSED',
      paymentId: 'payment-1',
      previousStatus: PaymentStatus.PENDING,
      currentStatus: PaymentStatus.APPROVED,
    });
  });
});
