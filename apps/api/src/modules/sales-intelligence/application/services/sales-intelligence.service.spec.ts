import { SalesIntelligenceService } from './sales-intelligence.service';

describe('SalesIntelligenceService', () => {
  const service = new SalesIntelligenceService();

  it('returns a tenant-safe empty foundation page', () => {
    expect(service.list('tenant-1', { page: 2, perPage: 25 })).toEqual({
      data: [],
      meta: { page: 2, perPage: 25, total: 0, totalPages: 0 },
    });
  });

  it('returns zeroed minor-unit summary without mocked financial data', () => {
    expect(service.getSummary('tenant-1')).toEqual({
      orderCount: 0,
      paidAmountMinor: '0',
      feeAmountMinor: '0',
      netAmountMinor: '0',
      realizedNetAmountMinor: '0',
      reconciledNetAmountMinor: '0',
      estimatedNetAmountMinor: '0',
      stockIssueCount: 0,
      currency: 'BRL',
    });
  });
});
