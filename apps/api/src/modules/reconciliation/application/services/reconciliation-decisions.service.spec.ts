import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PaymentProvider,
  ReconciliationCaseStatus,
  ReconciliationDecisionAction,
  ReconciliationMatchType,
  WebhookProvider,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ReconciliationDecisionsService } from './reconciliation-decisions.service';

describe('ReconciliationDecisionsService', () => {
  const prisma = {
    reconciliationCase: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
    },
    reconciliationDecision: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
  };

  let service: ReconciliationDecisionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReconciliationDecisionsService(prisma as never);
    prisma.reconciliationCase.findFirst.mockResolvedValue(reconciliationCase());
    prisma.payment.findFirst.mockResolvedValue(payment());
    prisma.reconciliationDecision.create.mockResolvedValue({
      id: 'decision-1',
      action: ReconciliationDecisionAction.MANUAL_MATCH,
    });
    prisma.reconciliationCase.update.mockResolvedValue({
      ...reconciliationCase(),
      status: ReconciliationCaseStatus.MANUALLY_MATCHED,
      paymentId: 'payment-1',
    });
  });

  it('manually links a tenant payment and records an immutable audited decision', async () => {
    const result = await service.createDecision('tenant-1', 'user-1', 'case-1', {
      action: ReconciliationDecisionAction.MANUAL_MATCH,
      paymentId: 'payment-1',
      reasonCode: 'MANUAL_PAYMENT_CONFIRMED',
      comment: 'Confirmed by finance operations.',
    });

    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { id: 'payment-1', tenantId: 'tenant-1' },
    });
    expect(prisma.reconciliationDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        caseId: 'case-1',
        actorUserId: 'user-1',
        action: ReconciliationDecisionAction.MANUAL_MATCH,
        reasonCode: 'MANUAL_PAYMENT_CONFIRMED',
        comment: 'Confirmed by finance operations.',
        previousStatus: ReconciliationCaseStatus.AMBIGUOUS,
        nextStatus: ReconciliationCaseStatus.MANUALLY_MATCHED,
        paymentId: 'payment-1',
      }),
    });
    expect(prisma.reconciliationCase.update).toHaveBeenCalledWith({
      where: { id: 'case-1' },
      data: expect.objectContaining({
        status: ReconciliationCaseStatus.MANUALLY_MATCHED,
        matchType: ReconciliationMatchType.EXPLICIT_LINK,
        paymentId: 'payment-1',
        matchedAt: expect.any(Date),
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'reconciliation.decision.manual_match',
        entityType: 'ReconciliationCase',
        entityId: 'case-1',
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        decision: expect.objectContaining({ id: 'decision-1' }),
        case: expect.objectContaining({
          status: ReconciliationCaseStatus.MANUALLY_MATCHED,
        }),
      }),
    );
  });

  it('blocks manual match when the payment does not belong to the tenant', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.createDecision('tenant-1', 'user-1', 'case-1', {
        action: ReconciliationDecisionAction.MANUAL_MATCH,
        paymentId: 'cross-tenant-payment',
        reasonCode: 'MANUAL_PAYMENT_CONFIRMED',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.reconciliationDecision.create).not.toHaveBeenCalled();
  });

  it('blocks decisions when the case does not belong to the tenant', async () => {
    prisma.reconciliationCase.findFirst.mockResolvedValue(null);

    await expect(
      service.createDecision('tenant-1', 'user-1', 'case-1', {
        action: ReconciliationDecisionAction.IGNORE,
        reasonCode: 'PROVIDER_NOISE',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records operational comments without changing the case status', async () => {
    await service.createDecision('tenant-1', 'user-1', 'case-1', {
      action: ReconciliationDecisionAction.COMMENT,
      reasonCode: 'OPERATIONAL_NOTE',
      comment: 'Waiting provider confirmation.',
    });

    expect(prisma.reconciliationDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: ReconciliationDecisionAction.COMMENT,
        previousStatus: ReconciliationCaseStatus.AMBIGUOUS,
        nextStatus: ReconciliationCaseStatus.AMBIGUOUS,
      }),
    });
    expect(prisma.reconciliationCase.update).toHaveBeenCalledWith({
      where: { id: 'case-1' },
      data: { status: ReconciliationCaseStatus.AMBIGUOUS },
    });
  });

  it('rejects decisions with reason codes not allowed for the selected action', async () => {
    await expect(
      service.createDecision('tenant-1', 'user-1', 'case-1', {
        action: ReconciliationDecisionAction.IGNORE,
        reasonCode: 'MANUAL_PAYMENT_CONFIRMED',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.reconciliationDecision.create).not.toHaveBeenCalled();
  });

  function reconciliationCase(overrides: Record<string, unknown> = {}) {
    return {
      id: 'case-1',
      tenantId: 'tenant-1',
      provider: WebhookProvider.ASAAS,
      status: ReconciliationCaseStatus.AMBIGUOUS,
      matchType: ReconciliationMatchType.AMOUNT_CURRENCY_TIME_CANDIDATE,
      settlementEventId: 'settlement-1',
      paymentId: null,
      expectedAmountMinor: new Prisma.Decimal('12345'),
      receivedAmountMinor: new Prisma.Decimal('12345'),
      differenceAmountMinor: new Prisma.Decimal('0'),
      currency: 'BRL',
      currencyExponent: 2,
      policyVersion: 1,
      matchedAt: null,
      reconciledAt: null,
      createdAt: new Date('2026-07-03T10:00:00.000Z'),
      updatedAt: new Date('2026-07-03T10:00:00.000Z'),
      ...overrides,
    };
  }

  function payment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'payment-1',
      tenantId: 'tenant-1',
      provider: PaymentProvider.ASAAS,
      providerPaymentId: 'pay-1',
      amount: 12345,
      currency: 'BRL',
      ...overrides,
    };
  }
});
