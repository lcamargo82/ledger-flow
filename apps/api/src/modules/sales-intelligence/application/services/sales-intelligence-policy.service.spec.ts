import { SalesIntelligencePolicyService } from './sales-intelligence-policy.service';

describe('SalesIntelligencePolicyService', () => {
  const prisma = {
    salesIntelligencePolicy: { findUnique: jest.fn(), upsert: jest.fn() },
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns a non-persisted 10 percent enabled default', async () => {
    prisma.salesIntelligencePolicy.findUnique.mockResolvedValue(null);
    const service = new SalesIntelligencePolicyService(prisma as never);

    await expect(service.getPolicy('tenant-1')).resolves.toEqual({
      lowMarginEnabled: true,
      lowMarginThreshold: '10.00',
    });
    expect(prisma.salesIntelligencePolicy.upsert).not.toHaveBeenCalled();
  });

  it('upserts a tenant-scoped policy and serializes its decimal threshold', async () => {
    prisma.salesIntelligencePolicy.upsert.mockResolvedValue({
      lowMarginEnabled: false,
      lowMarginThreshold: { toFixed: () => '8.50' },
    });
    const service = new SalesIntelligencePolicyService(prisma as never);

    await expect(
      service.updatePolicy('tenant-1', { lowMarginEnabled: false, lowMarginThreshold: 8.5 }),
    ).resolves.toEqual({ lowMarginEnabled: false, lowMarginThreshold: '8.50' });
    expect(prisma.salesIntelligencePolicy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
    );
  });
});
