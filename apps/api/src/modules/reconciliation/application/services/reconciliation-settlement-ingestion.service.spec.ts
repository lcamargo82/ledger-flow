import { Prisma } from '@prisma/client';
import { ReconciliationSettlementIngestionService } from './reconciliation-settlement-ingestion.service';
import { AsaasReconciliationProviderAdapter } from '../../infra/adapters/asaas-reconciliation-provider.adapter';

describe('ReconciliationSettlementIngestionService', () => {
  const prisma = {
    providerSettlementEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const adapter = new AsaasReconciliationProviderAdapter();
  let service: ReconciliationSettlementIngestionService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    service = new ReconciliationSettlementIngestionService(prisma as never, adapter);
  });

  it('creates a settlement event and outbox event for the first webhook ingest', async () => {
    prisma.providerSettlementEvent.findUnique.mockResolvedValue(null);
    prisma.providerSettlementEvent.create.mockResolvedValue({
      id: 'settlement-1',
      tenantId: 'tenant-1',
      provider: 'ASAAS',
      providerEventId: 'evt_123',
    });

    const result = await service.ingestAsaasWebhookInbox({
      id: 'inbox-1',
      tenantId: 'tenant-1',
      provider: 'ASAAS',
      providerEventId: 'evt_123',
      eventType: 'PAYMENT_RECEIVED',
      providerPaymentId: 'pay_123',
      externalReference: 'LF-123',
      providerPaymentStatus: 'RECEIVED',
      payloadHash: 'hash-123',
      payloadSummary: {
        value: 123.45,
        eventId: 'evt_123',
        eventType: 'PAYMENT_RECEIVED',
      },
      receivedAt: new Date('2026-07-03T10:00:00.000Z'),
    } as never);

    expect(result.created).toBe(true);
    expect(prisma.providerSettlementEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        provider: 'ASAAS',
        providerEventId: 'evt_123',
        providerPaymentId: 'pay_123',
        externalReference: 'LF-123',
        amountMinor: new Prisma.Decimal('12345'),
        currency: 'BRL',
        currencyExponent: 2,
        sourceWebhookInboxEventId: 'inbox-1',
      }),
    });
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aggregateType: 'ProviderSettlementEvent',
        aggregateId: 'settlement-1',
        eventType: 'reconciliation.settlement_received',
        eventVersion: 1,
      }),
    });
  });

  it('returns an existing settlement without creating another outbox event', async () => {
    prisma.providerSettlementEvent.findUnique.mockResolvedValue({
      id: 'settlement-existing',
      provider: 'ASAAS',
      providerEventId: 'evt_123',
    });

    const result = await service.ingestAsaasWebhookInbox({
      id: 'inbox-1',
      tenantId: 'tenant-1',
      provider: 'ASAAS',
      providerEventId: 'evt_123',
      eventType: 'PAYMENT_RECEIVED',
      payloadHash: 'hash-123',
      payloadSummary: { value: 123.45 },
      receivedAt: new Date('2026-07-03T10:00:00.000Z'),
    } as never);

    expect(result).toEqual({
      settlementEvent: {
        id: 'settlement-existing',
        provider: 'ASAAS',
        providerEventId: 'evt_123',
      },
      created: false,
    });
    expect(prisma.providerSettlementEvent.create).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });

  it('stores orphaned settlement events without tenant-scoped case creation', async () => {
    prisma.providerSettlementEvent.findUnique.mockResolvedValue(null);
    prisma.providerSettlementEvent.create.mockResolvedValue({
      id: 'settlement-orphaned',
      tenantId: null,
      provider: 'ASAAS',
      providerEventId: 'evt_orphaned',
    });

    await service.ingestAsaasWebhookInbox({
      id: 'inbox-orphaned',
      tenantId: null,
      provider: 'ASAAS',
      providerEventId: 'evt_orphaned',
      eventType: 'PAYMENT_RECEIVED',
      providerPaymentId: 'pay_orphaned',
      providerPaymentStatus: 'RECEIVED',
      payloadHash: 'hash-orphaned',
      payloadSummary: { value: 10 },
      receivedAt: new Date('2026-07-03T10:00:00.000Z'),
    } as never);

    expect(prisma.providerSettlementEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: null,
        sourceWebhookInboxEventId: 'inbox-orphaned',
      }),
    });
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: null,
        eventType: 'reconciliation.settlement_received',
      }),
    });
  });
});
