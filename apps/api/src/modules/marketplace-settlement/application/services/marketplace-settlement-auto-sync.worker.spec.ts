import { MarketplaceSettlementAutoSyncWorker } from './marketplace-settlement-auto-sync.worker';

describe('MarketplaceSettlementAutoSyncWorker', () => {
  const prisma = {
    operationalFinancialAccount: {
      findMany: jest.fn(),
    },
  };
  const ingestionService = {
    syncMercadoPagoByPeriod: jest.fn(),
  };

  let worker: MarketplaceSettlementAutoSyncWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new MarketplaceSettlementAutoSyncWorker(prisma as never, ingestionService as never);
    prisma.operationalFinancialAccount.findMany.mockResolvedValue([
      { id: 'account-1', tenantId: 'tenant-1' },
      { id: 'account-2', tenantId: 'tenant-2' },
    ]);
    ingestionService.syncMercadoPagoByPeriod.mockResolvedValue({
      received: 0,
      created: 0,
      updated: 0,
      duplicates: 0,
    });
  });

  it('syncs active Mercado Pago accounts with a moving lookback window as worker actor', async () => {
    await worker.runOnce(new Date('2026-08-05T21:20:00.000Z'));

    expect(prisma.operationalFinancialAccount.findMany).toHaveBeenCalledWith({
      where: {
        provider: 'MERCADO_PAGO',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        tenantId: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(ingestionService.syncMercadoPagoByPeriod).toHaveBeenCalledTimes(2);
    expect(ingestionService.syncMercadoPagoByPeriod).toHaveBeenCalledWith(
      'tenant-1',
      null,
      'account-1',
      {
        from: '2026-08-03T21:20:00.000Z',
        to: '2026-08-05T21:20:00.000Z',
        maxPages: 3,
      },
    );
  });

  it('continues syncing other accounts when one account fails', async () => {
    ingestionService.syncMercadoPagoByPeriod
      .mockRejectedValueOnce(new Error('token expired'))
      .mockResolvedValueOnce({
        received: 1,
        created: 1,
        updated: 0,
        duplicates: 0,
      });

    await worker.runOnce(new Date('2026-08-05T21:20:00.000Z'));

    expect(ingestionService.syncMercadoPagoByPeriod).toHaveBeenCalledTimes(2);
  });
});
