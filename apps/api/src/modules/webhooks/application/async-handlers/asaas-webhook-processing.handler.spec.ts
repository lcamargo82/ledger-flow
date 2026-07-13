import { WebhookProcessingStatus, WebhookProvider } from '@prisma/client';
import { AsaasWebhookProcessingAsyncHandler } from './asaas-webhook-processing.handler';

describe('AsaasWebhookProcessingAsyncHandler', () => {
  const prisma = {
    webhookInboxEvent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const processor = {
    process: jest.fn(),
  };
  const processorRegistry = {
    getProcessor: jest.fn(),
  };
  const reconciliationIngestion = {
    ingestAsaasWebhookInbox: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    processorRegistry.getProcessor.mockReturnValue(processor);
    processor.process.mockResolvedValue({ status: 'PROCESSED' });
  });

  it('ingests a reconciliation settlement after processing an Asaas webhook inbox event', async () => {
    const inboxEvent = {
      id: 'inbox-1',
      provider: WebhookProvider.ASAAS,
      providerEventId: 'evt_123',
      eventType: 'PAYMENT_RECEIVED',
      providerPaymentId: 'pay_123',
      externalReference: 'LF-123',
      providerPaymentStatus: 'RECEIVED',
      status: WebhookProcessingStatus.RECEIVED,
      payloadHash: 'hash-123',
      payloadSummary: {
        value: 123.45,
        eventDate: '2026-07-03T10:00:00.000Z',
      },
      receivedAt: new Date('2026-07-03T10:00:00.000Z'),
    };
    prisma.webhookInboxEvent.findUnique.mockResolvedValue(inboxEvent);

    const handler = new AsaasWebhookProcessingAsyncHandler(
      prisma as never,
      processorRegistry as never,
      reconciliationIngestion as never,
    );

    await handler.handle({
      messageId: 'outbox-1',
      eventType: 'webhook.inbound_processing_requested',
      eventVersion: 1,
      aggregateType: 'WebhookInboxEvent',
      aggregateId: 'inbox-1',
      occurredAt: '2026-07-03T10:00:00.000Z',
      payload: {},
    });

    expect(processor.process).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: WebhookProvider.ASAAS,
        providerEventId: 'evt_123',
      }),
    );
    expect(reconciliationIngestion.ingestAsaasWebhookInbox).toHaveBeenCalledWith(inboxEvent);
  });

  it('does not run Asaas reconciliation ingestion for Mercado Pago webhook inbox events', async () => {
    const inboxEvent = {
      id: 'inbox-mp-1',
      provider: WebhookProvider.MERCADO_PAGO,
      providerEventId: 'mp:payment:updated:123',
      eventType: 'payment',
      providerPaymentId: '123',
      externalReference: null,
      providerPaymentStatus: 'payment.updated',
      gatewayConfigurationId: 'gateway-1',
      status: WebhookProcessingStatus.RECEIVED,
      payloadHash: 'hash-mp-123',
      payloadSummary: {
        resourceId: '123',
        merchantId: '456',
      },
      receivedAt: new Date('2026-07-13T10:00:00.000Z'),
    };
    prisma.webhookInboxEvent.findUnique.mockResolvedValue(inboxEvent);

    const handler = new AsaasWebhookProcessingAsyncHandler(
      prisma as never,
      processorRegistry as never,
      reconciliationIngestion as never,
    );

    await handler.handle({
      messageId: 'outbox-mp-1',
      eventType: 'webhook.inbound_processing_requested',
      eventVersion: 1,
      aggregateType: 'WebhookInboxEvent',
      aggregateId: 'inbox-mp-1',
      occurredAt: '2026-07-13T10:00:00.000Z',
      payload: {},
    });

    expect(processor.process).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: WebhookProvider.MERCADO_PAGO,
        providerEventId: 'mp:payment:updated:123',
        gatewayConfigurationId: 'gateway-1',
      }),
    );
    expect(reconciliationIngestion.ingestAsaasWebhookInbox).not.toHaveBeenCalled();
  });
});
