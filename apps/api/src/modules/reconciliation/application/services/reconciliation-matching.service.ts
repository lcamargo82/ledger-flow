import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ProviderSettlementEvent,
  ReconciliationCase,
  ReconciliationCaseStatus,
  ReconciliationMatchType,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';

interface MatchSettlementResult {
  case: ReconciliationCase | null;
  created: boolean;
  reason?: string;
}

type MatchResult = {
  payment: Payment | null;
  matchType: ReconciliationMatchType;
  ambiguous?: boolean;
};

@Injectable()
export class ReconciliationMatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async matchSettlement(
    settlementEventId: string,
  ): Promise<MatchSettlementResult> {
    const settlement = await this.prisma.providerSettlementEvent.findUnique({
      where: { id: settlementEventId },
    });

    if (!settlement) {
      throw new NotFoundException('Provider settlement event not found.');
    }

    if (!settlement.tenantId) {
      return { case: null, created: false, reason: 'ORPHANED_SETTLEMENT' };
    }

    const existing = await this.prisma.reconciliationCase.findUnique({
      where: {
        tenantId_settlementEventId: {
          tenantId: settlement.tenantId,
          settlementEventId: settlement.id,
        },
      },
    });
    if (existing) {
      return { case: existing, created: false };
    }

    const policy = await this.findPolicy(settlement);
    const match = await this.findMatch(settlement);
    const reconciliationCase = await this.prisma.reconciliationCase.create({
      data: this.buildCaseData(settlement, match, policy),
    });

    return { case: reconciliationCase, created: true };
  }

  private async findPolicy(settlement: ProviderSettlementEvent) {
    if (!settlement.tenantId) return null;

    return this.prisma.reconciliationPolicy.findFirst({
      where: {
        tenantId: settlement.tenantId,
        currency: settlement.currency,
        isActive: true,
        OR: [{ provider: settlement.provider }, { provider: null }],
      },
      orderBy: [{ provider: 'desc' }, { version: 'desc' }],
    });
  }

  private async findMatch(settlement: ProviderSettlementEvent): Promise<MatchResult | null> {
    if (!settlement.tenantId) return null;

    if (settlement.providerPaymentId) {
      const payment = await this.prisma.payment.findFirst({
        where: {
          tenantId: settlement.tenantId,
          provider: settlement.provider as unknown as PaymentProvider,
          providerPaymentId: settlement.providerPaymentId,
        },
      });
      if (payment) {
        return { payment, matchType: ReconciliationMatchType.PROVIDER_PAYMENT_ID };
      }
    }

    if (settlement.externalReference) {
      const payment = await this.prisma.payment.findFirst({
        where: {
          tenantId: settlement.tenantId,
          provider: settlement.provider as unknown as PaymentProvider,
          OR: [
            { reference: settlement.externalReference },
            { externalReference: settlement.externalReference },
          ],
        },
      });
      if (payment) {
        return { payment, matchType: ReconciliationMatchType.EXTERNAL_REFERENCE };
      }
    }

    const candidates = await this.findAmountCandidates(settlement);
    if (candidates.length === 1) {
      return {
        payment: candidates[0],
        matchType: ReconciliationMatchType.AMOUNT_CURRENCY_TIME_CANDIDATE,
      };
    }
    if (candidates.length > 1) {
      return {
        payment: null,
        matchType: ReconciliationMatchType.AMOUNT_CURRENCY_TIME_CANDIDATE,
        ambiguous: true,
      };
    }

    return null;
  }

  private async findAmountCandidates(settlement: ProviderSettlementEvent) {
    if (!settlement.tenantId || !settlement.amountMinor || !settlement.occurredAt) {
      return [];
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const occurredAt = settlement.occurredAt.getTime();

    return this.prisma.payment.findMany({
      where: {
        tenantId: settlement.tenantId,
        provider: settlement.provider as unknown as PaymentProvider,
        amount: Number(settlement.amountMinor.toString()),
        currency: settlement.currency,
        createdAt: {
          gte: new Date(occurredAt - dayMs),
          lte: new Date(occurredAt + dayMs),
        },
      },
      take: 2,
    });
  }

  private buildCaseData(
    settlement: ProviderSettlementEvent,
    match: MatchResult | null,
    policy: { version: number; amountToleranceMinor: Prisma.Decimal } | null,
  ): Prisma.ReconciliationCaseUncheckedCreateInput {
    const expectedAmountMinor = match?.payment
      ? new Prisma.Decimal(match.payment.amount)
      : undefined;
    const receivedAmountMinor =
      settlement.amountMinor === null || settlement.amountMinor === undefined
        ? undefined
        : new Prisma.Decimal(settlement.amountMinor);
    const differenceAmountMinor =
      expectedAmountMinor && receivedAmountMinor
        ? receivedAmountMinor.sub(expectedAmountMinor)
        : undefined;
    const tolerance = policy?.amountToleranceMinor ?? new Prisma.Decimal(0);
    const status = this.resolveStatus(
      settlement,
      match,
      differenceAmountMinor,
      tolerance,
    );

    return {
      tenantId: settlement.tenantId!,
      provider: settlement.provider,
      status,
      matchType: match?.matchType ?? ReconciliationMatchType.NONE,
      settlementEventId: settlement.id,
      paymentId: match?.payment?.id,
      expectedAmountMinor,
      receivedAmountMinor,
      differenceAmountMinor,
      currency: settlement.currency,
      currencyExponent: settlement.currencyExponent,
      policyVersion: policy?.version ?? 1,
      matchedAt: match?.payment ? new Date() : undefined,
      reconciledAt:
        status === ReconciliationCaseStatus.RECONCILED ? new Date() : undefined,
    };
  }

  private resolveStatus(
    settlement: ProviderSettlementEvent,
    match: MatchResult | null,
    differenceAmountMinor: Prisma.Decimal | undefined,
    tolerance: Prisma.Decimal,
  ) {
    if (match?.ambiguous) return ReconciliationCaseStatus.AMBIGUOUS;
    if (!match?.payment) return ReconciliationCaseStatus.UNMATCHED;
    if (match.payment.currency !== settlement.currency) {
      return ReconciliationCaseStatus.CURRENCY_DIVERGENCE;
    }
    const providerPaymentStatus = this.normalizeProviderStatus(
      settlement.providerStatus,
    );
    if (providerPaymentStatus && providerPaymentStatus !== match.payment.status) {
      return ReconciliationCaseStatus.STATUS_DIVERGENCE;
    }
    if (
      differenceAmountMinor &&
      differenceAmountMinor.absoluteValue().gt(tolerance)
    ) {
      return ReconciliationCaseStatus.AMOUNT_DIVERGENCE;
    }
    if (
      match.matchType === ReconciliationMatchType.AMOUNT_CURRENCY_TIME_CANDIDATE
    ) {
      return ReconciliationCaseStatus.AUTO_MATCHED;
    }

    return ReconciliationCaseStatus.RECONCILED;
  }

  private normalizeProviderStatus(providerStatus?: string | null) {
    if (!providerStatus) return null;

    const normalized = providerStatus.trim().toUpperCase();
    const statusMap: Record<string, PaymentStatus> = {
      APPROVED: PaymentStatus.APPROVED,
      RECEIVED: PaymentStatus.APPROVED,
      CONFIRMED: PaymentStatus.APPROVED,
      REFUNDED: PaymentStatus.REFUNDED,
      REFUND_REQUESTED: PaymentStatus.REFUNDED,
      CANCELED: PaymentStatus.CANCELED,
      CANCELLED: PaymentStatus.CANCELED,
      DELETED: PaymentStatus.CANCELED,
      FAILED: PaymentStatus.FAILED,
      OVERDUE: PaymentStatus.FAILED,
      PENDING: PaymentStatus.PENDING,
      PROCESSING: PaymentStatus.PROCESSING,
    };

    return statusMap[normalized] ?? null;
  }
}
