import {
  ReconciliationCaseStatus,
  ReconciliationMatchType,
  WebhookProvider,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ReconciliationDashboardService } from './reconciliation-dashboard.service';

describe('ReconciliationDashboardService', () => {
  const prisma = {
    reconciliationCase: {
      findMany: jest.fn(),
    },
  };

  let service: ReconciliationDashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T12:00:00.000Z'));
    service = new ReconciliationDashboardService(prisma as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns tenant and filter scoped reconciliation KPIs from case snapshots', async () => {
    prisma.reconciliationCase.findMany.mockResolvedValue([
      reconciliationCase({
        id: 'case-reconciled',
        status: ReconciliationCaseStatus.RECONCILED,
        expectedAmountMinor: '10000',
        receivedAmountMinor: '10000',
        differenceAmountMinor: '0',
        provider: WebhookProvider.ASAAS,
      }),
      reconciliationCase({
        id: 'case-pending',
        status: ReconciliationCaseStatus.UNMATCHED,
        expectedAmountMinor: '5000',
        receivedAmountMinor: '0',
        differenceAmountMinor: '5000',
        provider: WebhookProvider.ASAAS,
        createdAt: new Date('2026-06-30T10:00:00.000Z'),
      }),
      reconciliationCase({
        id: 'case-divergent',
        status: ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
        expectedAmountMinor: '20000',
        receivedAmountMinor: '19800',
        differenceAmountMinor: '-200',
        provider: WebhookProvider.ASAAS,
        createdAt: new Date('2026-06-25T10:00:00.000Z'),
      }),
    ]);

    const result = await service.getDashboard('tenant-1', {
      provider: WebhookProvider.ASAAS,
      currency: 'BRL',
      dateFrom: '2026-06-01T00:00:00.000Z',
      dateTo: '2026-07-03T23:59:59.999Z',
    });

    expect(prisma.reconciliationCase.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        provider: WebhookProvider.ASAAS,
        currency: 'BRL',
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lte: new Date('2026-07-03T23:59:59.999Z'),
        },
      },
      select: expect.any(Object),
    });
    expect(result.kpis).toEqual({
      expectedAmountMinor: '35000',
      reconciledAmountMinor: '10000',
      pendingAmountMinor: '5000',
      divergentAmountMinor: '200',
      totalCases: 3,
      reconciledCases: 1,
      pendingCases: 1,
      divergentCases: 1,
    });
    expect(result.byStatus).toEqual([
      { status: ReconciliationCaseStatus.RECONCILED, count: 1, amountMinor: '10000' },
      { status: ReconciliationCaseStatus.UNMATCHED, count: 1, amountMinor: '5000' },
      {
        status: ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
        count: 1,
        amountMinor: '20000',
      },
    ]);
    expect(result.byProvider).toEqual([
      {
        provider: WebhookProvider.ASAAS,
        count: 3,
        expectedAmountMinor: '35000',
        receivedAmountMinor: '29800',
      },
    ]);
    expect(result.agingBuckets).toEqual([
      { key: '0_1', label: '0-1d', count: 0, amountMinor: '0' },
      { key: '2_3', label: '2-3d', count: 1, amountMinor: '5000' },
      { key: '4_7', label: '4-7d', count: 0, amountMinor: '0' },
      { key: '8_plus', label: '8+d', count: 1, amountMinor: '20000' },
    ]);
    expect(result.note).toBe('cash_reconciliation_not_operational_margin');
  });

  function reconciliationCase(overrides: Record<string, unknown> = {}) {
    return {
      id: 'case-1',
      tenantId: 'tenant-1',
      provider: WebhookProvider.ASAAS,
      status: ReconciliationCaseStatus.RECONCILED,
      matchType: ReconciliationMatchType.PROVIDER_PAYMENT_ID,
      expectedAmountMinor: new Prisma.Decimal('10000'),
      receivedAmountMinor: new Prisma.Decimal('10000'),
      differenceAmountMinor: new Prisma.Decimal('0'),
      currency: 'BRL',
      createdAt: new Date('2026-07-03T10:00:00.000Z'),
      ...overrides,
    };
  }
});
