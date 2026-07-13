import { NotFoundException } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
  ReconciliationCaseStatus,
  ReconciliationMatchType,
  WebhookProvider,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ReconciliationCasesService } from './reconciliation-cases.service';

describe('ReconciliationCasesService', () => {
  const prisma = {
    reconciliationCase: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    reconciliationDecision: {
      findMany: jest.fn(),
    },
  };

  let service: ReconciliationCasesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReconciliationCasesService(prisma as never);
  });

  it('lists tenant-scoped cases with filters and normalized minor-unit fields', async () => {
    prisma.reconciliationCase.findMany.mockResolvedValue([reconciliationCase()]);
    prisma.reconciliationCase.count.mockResolvedValue(1);

    const result = await service.listCases('tenant-1', {
      page: 2,
      perPage: 10,
      status: ReconciliationCaseStatus.RECONCILED,
      provider: WebhookProvider.ASAAS,
      matchType: ReconciliationMatchType.PROVIDER_PAYMENT_ID,
      dateFrom: '2026-07-01T00:00:00.000Z',
      dateTo: '2026-07-03T23:59:59.999Z',
    });

    expect(prisma.reconciliationCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          status: ReconciliationCaseStatus.RECONCILED,
          provider: WebhookProvider.ASAAS,
          matchType: ReconciliationMatchType.PROVIDER_PAYMENT_ID,
          createdAt: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-03T23:59:59.999Z'),
          },
        },
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: 'case-1',
          expectedAmountMinor: '12345',
          receivedAmountMinor: '12345',
          differenceAmountMinor: '0',
        }),
      ],
      meta: { page: 2, perPage: 10, total: 1, totalPages: 1 },
    });
  });

  it('returns a tenant-scoped case detail', async () => {
    prisma.reconciliationCase.findFirst.mockResolvedValue(reconciliationCase());

    const result = await service.getCase('tenant-1', 'case-1');

    expect(prisma.reconciliationCase.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'case-1', tenantId: 'tenant-1' },
      }),
    );
    expect(result.id).toBe('case-1');
  });

  it('throws not found when the case does not belong to the tenant', async () => {
    prisma.reconciliationCase.findFirst.mockResolvedValue(null);

    await expect(service.getCase('tenant-1', 'case-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a fine-mesh timeline with sanitized settlement, payment, order and decision evidence', async () => {
    prisma.reconciliationCase.findFirst.mockResolvedValue(
      reconciliationCase({
        order: {
          id: 'order-1',
          orderNumber: 'ML-123',
          status: 'PAID',
        },
        settlementEvent: {
          id: 'settlement-1',
          providerEventId: 'evt-1',
          providerPaymentId: 'mp-payment-1',
          externalReference: 'ML-123',
          occurredAt: new Date('2026-07-03T10:00:00.000Z'),
        },
      }),
    );
    prisma.reconciliationDecision.findMany.mockResolvedValue([
      {
        id: 'decision-1',
        action: 'RESOLVE_EXCEPTION',
        reasonCode: 'PROVIDER_FEE_EXPLAINED',
        comment: 'Provider fee confirmed.',
        previousStatus: 'AMOUNT_DIVERGENCE',
        nextStatus: 'RESOLVED_EXCEPTION',
        paymentId: null,
        metadata: { safe: true },
        createdAt: new Date('2026-07-03T11:00:00.000Z'),
      },
    ]);

    const result = await service.getTimeline('tenant-1', 'case-1');

    expect(result.evidence.settlementEvent.providerPaymentId).toBe('mp-payment-1');
    expect(result.evidence.order?.orderNumber).toBe('ML-123');
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'CASE_CREATED' }),
        expect.objectContaining({ type: 'SETTLEMENT_EVENT_RECEIVED' }),
        expect.objectContaining({
          type: 'DECISION_RECORDED',
          decision: expect.objectContaining({ reasonCode: 'PROVIDER_FEE_EXPLAINED' }),
        }),
      ]),
    );
  });

  function reconciliationCase(overrides: Record<string, unknown> = {}) {
    return {
      id: 'case-1',
      tenantId: 'tenant-1',
      provider: WebhookProvider.ASAAS,
      status: ReconciliationCaseStatus.RECONCILED,
      matchType: ReconciliationMatchType.PROVIDER_PAYMENT_ID,
      settlementEventId: 'settlement-1',
      paymentId: 'payment-1',
      orderId: null,
      expectedAmountMinor: new Prisma.Decimal('12345'),
      receivedAmountMinor: new Prisma.Decimal('12345'),
      differenceAmountMinor: new Prisma.Decimal('0'),
      currency: 'BRL',
      currencyExponent: 2,
      policyVersion: 1,
      matchedAt: new Date('2026-07-03T10:00:00.000Z'),
      reconciledAt: new Date('2026-07-03T10:00:00.000Z'),
      createdAt: new Date('2026-07-03T10:00:00.000Z'),
      updatedAt: new Date('2026-07-03T10:00:00.000Z'),
      settlementEvent: {
        id: 'settlement-1',
        providerEventId: 'evt-1',
        providerPaymentId: 'pay-1',
        externalReference: 'LF-123',
        occurredAt: new Date('2026-07-03T10:00:00.000Z'),
      },
      payment: {
        id: 'payment-1',
        provider: PaymentProvider.ASAAS,
        providerPaymentId: 'pay-1',
        reference: 'LF-123',
        amount: 12345,
        currency: 'BRL',
        status: PaymentStatus.APPROVED,
      },
      ...overrides,
    };
  }
});
