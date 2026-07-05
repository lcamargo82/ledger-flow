import { WebhookProvider } from '@prisma/client';
import { ReconciliationSyncService } from './reconciliation-sync.service';
import { ReconciliationProviderAdapter } from '../../domain/interfaces/reconciliation-provider-adapter.interface';

describe('ReconciliationSyncService', () => {
  const ingestion = {
    ingestNormalizedSettlement: jest.fn(),
  };
  const prisma = {
    auditLog: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };

  let service: ReconciliationSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReconciliationSyncService(ingestion as never, prisma as never);
  });

  it('fetches settlement pages with jittered rate limits and delegates idempotency to ingestion', async () => {
    const adapter = adapterStub([
      {
        data: [settlement('evt-1'), settlement('evt-2')],
        nextCursor: 'next-page',
      },
      {
        data: [settlement('evt-2')],
      },
    ]);
    ingestion.ingestNormalizedSettlement
      .mockResolvedValueOnce({ created: true })
      .mockResolvedValueOnce({ created: true })
      .mockResolvedValueOnce({ created: false });

    const result = await service.syncProvider('tenant-1', 'user-1', adapter, {
      maxPages: 3,
      delayMs: 100,
      jitterSeed: 2,
    });

    expect(adapter.fetchSettlements).toHaveBeenNthCalledWith(1, {
      tenantId: 'tenant-1',
      cursor: undefined,
      from: undefined,
      to: undefined,
    });
    expect(adapter.fetchSettlements).toHaveBeenNthCalledWith(2, {
      tenantId: 'tenant-1',
      cursor: 'next-page',
      from: undefined,
      to: undefined,
    });
    expect(ingestion.ingestNormalizedSettlement).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      provider: WebhookProvider.ASAAS,
      pagesFetched: 2,
      received: 3,
      created: 2,
      duplicates: 1,
      circuitOpened: false,
      nextAttemptAt: null,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'reconciliation.sync.completed',
        entityType: 'ReconciliationSync',
      }),
    });
  });

  it('opens circuit after repeated provider failures', async () => {
    const adapter = adapterStub([]);
    adapter.fetchSettlements.mockRejectedValue(new Error('Provider 429'));

    const result = await service.syncProvider('tenant-1', 'user-1', adapter, {
      failureThreshold: 2,
      circuitOpenSeconds: 300,
      jitterSeed: 1,
    });

    expect(result.circuitOpened).toBe(true);
    expect(result.nextAttemptAt).toBeInstanceOf(Date);
    expect(adapter.fetchSettlements).toHaveBeenCalledTimes(2);
    expect(ingestion.ingestNormalizedSettlement).not.toHaveBeenCalled();
  });

  it('skips unsupported provider sync without fetching settlements', async () => {
    const adapter = adapterStub([]);
    adapter.supportsSettlementSync.mockReturnValue(false);

    const result = await service.syncProvider('tenant-1', 'user-1', adapter);

    expect(result).toEqual({
      provider: WebhookProvider.ASAAS,
      pagesFetched: 0,
      received: 0,
      created: 0,
      duplicates: 0,
      circuitOpened: true,
      nextAttemptAt: expect.any(Date),
    });
    expect(adapter.fetchSettlements).not.toHaveBeenCalled();
  });

  function adapterStub(
    pages: Array<{ data: ReturnType<typeof settlement>[]; nextCursor?: string }>,
  ) {
    return {
      provider: WebhookProvider.ASAAS,
      supportsSettlementSync: jest.fn().mockReturnValue(true),
      fetchSettlements: jest
        .fn()
        .mockImplementation(() => Promise.resolve(pages.shift() ?? { data: [] })),
      normalizeWebhook: jest.fn(),
    } as unknown as ReconciliationProviderAdapter & {
      fetchSettlements: jest.Mock;
      supportsSettlementSync: jest.Mock;
    };
  }

  function settlement(providerEventId: string) {
    return {
      provider: WebhookProvider.ASAAS,
      providerEventId,
      eventType: 'PAYMENT_RECEIVED',
      providerStatus: 'RECEIVED',
      amountMinor: '12345',
      currency: 'BRL',
      currencyExponent: 2,
      payloadHash: `hash-${providerEventId}`,
      normalizedPayload: { providerEventId },
    };
  }
});
