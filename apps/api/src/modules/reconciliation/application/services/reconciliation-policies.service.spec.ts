import { NotFoundException } from '@nestjs/common';
import { Prisma, WebhookProvider } from '@prisma/client';
import { ReconciliationPoliciesService } from './reconciliation-policies.service';

describe('ReconciliationPoliciesService', () => {
  const prisma = {
    reconciliationPolicy: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
  };

  let service: ReconciliationPoliciesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReconciliationPoliciesService(prisma as never);
    prisma.reconciliationPolicy.findFirst.mockResolvedValue(policy({ version: 2 }));
    prisma.reconciliationPolicy.create.mockResolvedValue(policy({ version: 3 }));
    prisma.reconciliationPolicy.update.mockResolvedValue(policy({ isActive: false }));
    prisma.reconciliationPolicy.updateMany.mockResolvedValue({ count: 1 });
  });

  it('creates a new active version without rewriting historical policy values', async () => {
    await service.createPolicy('tenant-1', 'user-1', {
      provider: WebhookProvider.ASAAS,
      currency: 'BRL',
      currencyExponent: 2,
      amountToleranceMinor: '150',
    });

    expect(prisma.reconciliationPolicy.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        provider: WebhookProvider.ASAAS,
        currency: 'BRL',
        isActive: true,
      },
      data: { isActive: false },
    });
    expect(prisma.reconciliationPolicy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        provider: WebhookProvider.ASAAS,
        currency: 'BRL',
        currencyExponent: 2,
        amountToleranceMinor: new Prisma.Decimal('150'),
        version: 3,
        isActive: true,
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'reconciliation.policy.created',
        entityType: 'ReconciliationPolicy',
      }),
    });
  });

  it('versions provider-neutral policy independently from provider-specific policy', async () => {
    prisma.reconciliationPolicy.findFirst.mockResolvedValueOnce(
      policy({
        provider: null,
        version: 4,
      }),
    );

    await service.createPolicy('tenant-1', 'user-1', {
      currency: 'BRL',
      currencyExponent: 2,
      amountToleranceMinor: '25',
    });

    expect(prisma.reconciliationPolicy.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        provider: null,
        currency: 'BRL',
        isActive: true,
      },
      data: { isActive: false },
    });
    expect(prisma.reconciliationPolicy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: null,
        version: 5,
      }),
    });
  });

  it('updates by creating the next policy version instead of mutating the current row', async () => {
    prisma.reconciliationPolicy.findFirst
      .mockResolvedValueOnce(policy({ id: 'policy-2', version: 2 }))
      .mockResolvedValueOnce(policy({ id: 'policy-2', version: 2 }));

    await service.updatePolicy('tenant-1', 'user-1', 'policy-2', {
      amountToleranceMinor: '300',
    });

    expect(prisma.reconciliationPolicy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amountToleranceMinor: new Prisma.Decimal('300'),
        version: 3,
      }),
    });
    expect(prisma.reconciliationPolicy.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountToleranceMinor: expect.anything() }),
      }),
    );
  });

  it('blocks update when policy belongs to another tenant', async () => {
    prisma.reconciliationPolicy.findFirst.mockResolvedValue(null);

    await expect(
      service.updatePolicy('tenant-1', 'user-1', 'policy-x', {
        amountToleranceMinor: '300',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  function policy(overrides: Record<string, unknown> = {}) {
    return {
      id: 'policy-1',
      tenantId: 'tenant-1',
      provider: WebhookProvider.ASAAS,
      currency: 'BRL',
      currencyExponent: 2,
      amountToleranceMinor: new Prisma.Decimal('100'),
      version: 1,
      isActive: true,
      createdAt: new Date('2026-07-03T10:00:00.000Z'),
      updatedAt: new Date('2026-07-03T10:00:00.000Z'),
      ...overrides,
    };
  }
});
