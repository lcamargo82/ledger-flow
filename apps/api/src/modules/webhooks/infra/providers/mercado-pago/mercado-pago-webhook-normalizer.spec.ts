import { WebhookProvider } from '@prisma/client';
import { MercadoPagoWebhookNormalizer } from './mercado-pago-webhook-normalizer';

describe('MercadoPagoWebhookNormalizer', () => {
  it('normalizes Mercado Pago payment notifications into a sanitized summary', async () => {
    const normalizer = new MercadoPagoWebhookNormalizer();

    const result = await normalizer.normalize({
      headers: {},
      receivedAt: new Date('2026-07-13T12:00:00.000Z'),
      payload: {
        id: 123,
        type: 'payment',
        action: 'payment.updated',
        user_id: 456,
        live_mode: true,
        api_version: 'v1',
        data: { id: 'payment-123' },
      },
    });

    expect(result).toMatchObject({
      provider: WebhookProvider.MERCADO_PAGO,
      providerEventId: '123',
      rawProviderEventType: 'payment',
      providerPaymentId: 'payment-123',
      providerStatus: 'payment.updated',
      metadata: {
        merchantId: '456',
        resourceId: 'payment-123',
        action: 'payment.updated',
      },
    });
    expect(result.payloadSummary).toEqual({
      providerEventId: '123',
      eventType: 'payment',
      action: 'payment.updated',
      resourceId: 'payment-123',
      merchantId: '456',
      liveMode: true,
      apiVersion: 'v1',
      dateCreated: undefined,
    });
  });
});
