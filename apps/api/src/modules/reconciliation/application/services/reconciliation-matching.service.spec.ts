import {
  PaymentProvider,
  PaymentStatus,
  ReconciliationCaseStatus,
  ReconciliationMatchType,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ReconciliationMatchingService } from './reconciliation-matching.service';

describe('ReconciliationMatchingService', () => {
  const prisma = {
    providerSettlementEvent: {
      findUnique: jest.fn(),
    },
    reconciliationCase: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    reconciliationPolicy: {
      findFirst: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: ReconciliationMatchingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReconciliationMatchingService(prisma as never);
    prisma.reconciliationCase.findUnique.mockResolvedValue(null);
    prisma.reconciliationPolicy.findFirst.mockResolvedValue(null);
    prisma.payment.findMany.mockResolvedValue([]);
  });

  it('creates a reconciled case for an exact provider payment id match', async () => {
    prisma.providerSettlementEvent.findUnique.mockResolvedValue(
      settlement({ providerPaymentId: 'pay_123', amountMinor: '12345' }),
    );
    prisma.payment.findFirst.mockResolvedValue(
      payment({ providerPaymentId: 'pay_123', amount: 12345 }),
    );
    prisma.reconciliationCase.create.mockResolvedValue({ id: 'case-1' });

    const result = await service.matchSettlement('settlement-1');

    expect(result.created).toBe(true);
    expect(prisma.reconciliationCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        status: ReconciliationCaseStatus.RECONCILED,
        matchType: ReconciliationMatchType.PROVIDER_PAYMENT_ID,
        settlementEventId: 'settlement-1',
        paymentId: 'payment-1',
        expectedAmountMinor: new Prisma.Decimal('12345'),
        receivedAmountMinor: new Prisma.Decimal('12345'),
        differenceAmountMinor: new Prisma.Decimal('0'),
        policyVersion: 1,
      }),
    });
  });

  it('matches by external reference after provider payment id is not found', async () => {
    prisma.providerSettlementEvent.findUnique.mockResolvedValue(
      settlement({ providerPaymentId: 'missing', externalReference: 'LF-123' }),
    );
    prisma.payment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(payment({ reference: 'LF-123', amount: 12345 }));
    prisma.reconciliationCase.create.mockResolvedValue({ id: 'case-2' });

    await service.matchSettlement('settlement-1');

    expect(prisma.reconciliationCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: ReconciliationCaseStatus.RECONCILED,
        matchType: ReconciliationMatchType.EXTERNAL_REFERENCE,
        paymentId: 'payment-1',
      }),
    });
  });

  it('creates an amount divergence case when exact match has different amount', async () => {
    prisma.providerSettlementEvent.findUnique.mockResolvedValue(
      settlement({ providerPaymentId: 'pay_123', amountMinor: '12345' }),
    );
    prisma.payment.findFirst.mockResolvedValue(
      payment({ providerPaymentId: 'pay_123', amount: 12000 }),
    );
    prisma.reconciliationCase.create.mockResolvedValue({ id: 'case-3' });

    await service.matchSettlement('settlement-1');

    expect(prisma.reconciliationCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
        expectedAmountMinor: new Prisma.Decimal('12000'),
        receivedAmountMinor: new Prisma.Decimal('12345'),
        differenceAmountMinor: new Prisma.Decimal('345'),
      }),
    });
  });

  it('does not create a tenant-scoped case when settlement has no tenant', async () => {
    prisma.providerSettlementEvent.findUnique.mockResolvedValue(
      settlement({ tenantId: null }),
    );

    const result = await service.matchSettlement('settlement-1');

    expect(result).toEqual({ case: null, created: false, reason: 'ORPHANED_SETTLEMENT' });
    expect(prisma.reconciliationCase.create).not.toHaveBeenCalled();
  });

  function settlement(overrides: Record<string, unknown> = {}) {
    return {
      id: 'settlement-1',
      tenantId: 'tenant-1',
      provider: PaymentProvider.ASAAS,
      providerEventId: 'evt_123',
      providerPaymentId: 'pay_123',
      externalReference: 'LF-123',
      providerStatus: 'RECEIVED',
      amountMinor: new Prisma.Decimal('12345'),
      currency: 'BRL',
      currencyExponent: 2,
      occurredAt: new Date('2026-07-03T10:00:00.000Z'),
      ...overrides,
    };
  }

  function payment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'payment-1',
      tenantId: 'tenant-1',
      provider: PaymentProvider.ASAAS,
      providerPaymentId: 'pay_123',
      reference: 'LF-123',
      externalReference: null,
      amount: 12345,
      currency: 'BRL',
      status: PaymentStatus.APPROVED,
      createdAt: new Date('2026-07-03T09:55:00.000Z'),
      ...overrides,
    };
  }
});
