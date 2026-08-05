import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ChannelProvider,
  Payment,
  PaymentStatus,
  Prisma,
  ProviderSettlementEvent,
  ReconciliationCase,
  ReconciliationCaseStatus,
  ReconciliationMatchType,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { NotificationProducerService } from '../../../notifications/application/services/notification-producer.service';

interface MatchSettlementResult {
  case: ReconciliationCase | null;
  created: boolean;
  reason?: string;
}

type MatchResult = {
  payment?: Payment | null;
  order?: MarketplaceOrderMatch | null;
  matchType: ReconciliationMatchType;
  ambiguous?: boolean;
};

type MarketplaceOrderMatch = {
  id: string;
  tenantId: string;
  orderId: string;
  externalOrderId: string | null;
  revenueAmount: Prisma.Decimal;
  currency: string;
  calculatedAt: Date;
};

@Injectable()
export class ReconciliationMatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationProducer?: NotificationProducerService,
  ) {}

  async matchSettlement(settlementEventId: string): Promise<MatchSettlementResult> {
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

    const policy = await this.findPolicy(settlement);
    const match = await this.findMatch(settlement);
    const caseData = this.buildCaseData(settlement, match, policy);

    if (existing) {
      const reconciliationCase = await this.prisma.reconciliationCase.update({
        where: { id: existing.id },
        data: this.toCaseUpdateData(caseData),
      });
      await this.notifyDivergence(reconciliationCase);
      return { case: reconciliationCase, created: false };
    }

    const reconciliationCase = await this.prisma.reconciliationCase.create({
      data: caseData,
    });
    await this.notifyDivergence(reconciliationCase);

    return { case: reconciliationCase, created: true };
  }

  private async notifyDivergence(reconciliationCase: ReconciliationCase) {
    const divergentStatuses: ReconciliationCaseStatus[] = [
      ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
      ReconciliationCaseStatus.CURRENCY_DIVERGENCE,
      ReconciliationCaseStatus.STATUS_DIVERGENCE,
    ];
    if (!divergentStatuses.includes(reconciliationCase.status)) return;

    await this.notificationProducer?.reconciliationDivergence({
      tenantId: reconciliationCase.tenantId,
      caseId: reconciliationCase.id,
    });
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
          provider: settlement.provider,
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
          provider: settlement.provider,
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

    const orderReferenceMatch = await this.findMarketplaceOrderReferenceMatch(settlement);
    if (orderReferenceMatch) {
      return {
        order: orderReferenceMatch,
        matchType: ReconciliationMatchType.MARKETPLACE_ORDER_ID,
      };
    }

    const candidates = await this.findAmountCandidates(settlement);
    if (candidates.paymentCandidates.length === 1 && candidates.orderCandidates.length === 0) {
      return {
        payment: candidates.paymentCandidates[0],
        matchType: ReconciliationMatchType.AMOUNT_CURRENCY_TIME_CANDIDATE,
      };
    }
    if (candidates.orderCandidates.length === 1 && candidates.paymentCandidates.length === 0) {
      return {
        order: candidates.orderCandidates[0],
        matchType: ReconciliationMatchType.AMOUNT_CURRENCY_TIME_CANDIDATE,
      };
    }
    if (candidates.paymentCandidates.length + candidates.orderCandidates.length > 1) {
      return {
        payment: null,
        order: null,
        matchType: ReconciliationMatchType.AMOUNT_CURRENCY_TIME_CANDIDATE,
        ambiguous: true,
      };
    }

    return null;
  }

  private async findMarketplaceOrderReferenceMatch(settlement: ProviderSettlementEvent) {
    if (!settlement.tenantId) return null;

    const references = this.extractMarketplaceOrderReferences(settlement);
    if (references.length === 0) return null;

    return this.prisma.orderFinancialFact.findFirst({
      where: {
        tenantId: settlement.tenantId,
        channelProvider: ChannelProvider.MERCADO_LIVRE,
        externalOrderId: { in: references },
      },
      orderBy: [{ version: 'desc' }, { calculatedAt: 'desc' }],
    });
  }

  private async findAmountCandidates(settlement: ProviderSettlementEvent) {
    const receivedAmountMinor = this.resolveSettlementReceivedAmountMinor(settlement);
    if (!settlement.tenantId || !receivedAmountMinor || !settlement.occurredAt) {
      return { paymentCandidates: [], orderCandidates: [] };
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const occurredAt = settlement.occurredAt.getTime();

    const [paymentCandidates, rawOrderCandidates] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          tenantId: settlement.tenantId,
          provider: settlement.provider,
          amount: Number(receivedAmountMinor.toString()),
          currency: settlement.currency,
          createdAt: {
            gte: new Date(occurredAt - dayMs),
            lte: new Date(occurredAt + dayMs),
          },
        },
        take: 2,
      }),
      this.prisma.orderFinancialFact.findMany({
        where: {
          tenantId: settlement.tenantId,
          channelProvider: ChannelProvider.MERCADO_LIVRE,
          currency: settlement.currency,
          calculatedAt: {
            gte: new Date(occurredAt - dayMs),
            lte: new Date(occurredAt + dayMs),
          },
        },
        orderBy: { calculatedAt: 'desc' },
        take: 10,
      }),
    ]);
    const orderCandidates = rawOrderCandidates
      .filter((fact) =>
        this.majorDecimalToMinor(fact.revenueAmount).equals(receivedAmountMinor),
      )
      .slice(0, 2);

    return { paymentCandidates, orderCandidates };
  }

  private buildCaseData(
    settlement: ProviderSettlementEvent,
    match: MatchResult | null,
    policy: { version: number; amountToleranceMinor: Prisma.Decimal } | null,
  ): Prisma.ReconciliationCaseUncheckedCreateInput {
    const expectedAmountMinor = this.resolveExpectedAmountMinor(match);
    const receivedAmountMinor = this.resolveSettlementReceivedAmountMinor(settlement);
    const differenceAmountMinor =
      expectedAmountMinor && receivedAmountMinor
        ? receivedAmountMinor.sub(expectedAmountMinor)
        : undefined;
    const tolerance = policy?.amountToleranceMinor ?? new Prisma.Decimal(0);
    const status = this.resolveStatus(settlement, match, differenceAmountMinor, tolerance);

    return {
      tenantId: settlement.tenantId!,
      provider: settlement.provider,
      status,
      matchType: match?.matchType ?? ReconciliationMatchType.NONE,
      settlementEventId: settlement.id,
      paymentId: match?.payment?.id,
      orderId: match?.order?.orderId,
      expectedAmountMinor,
      receivedAmountMinor,
      differenceAmountMinor,
      currency: settlement.currency,
      currencyExponent: settlement.currencyExponent,
      policyVersion: policy?.version ?? 1,
      matchedAt: match?.payment || match?.order ? new Date() : undefined,
      reconciledAt: status === ReconciliationCaseStatus.RECONCILED ? new Date() : undefined,
    };
  }

  private toCaseUpdateData(
    data: Prisma.ReconciliationCaseUncheckedCreateInput,
  ): Prisma.ReconciliationCaseUncheckedUpdateInput {
    return {
      provider: data.provider,
      status: data.status,
      matchType: data.matchType,
      paymentId: data.paymentId ?? null,
      orderId: data.orderId ?? null,
      expectedAmountMinor: data.expectedAmountMinor ?? null,
      receivedAmountMinor: data.receivedAmountMinor ?? null,
      differenceAmountMinor: data.differenceAmountMinor ?? null,
      currency: data.currency,
      currencyExponent: data.currencyExponent,
      policyVersion: data.policyVersion,
      matchedAt: data.matchedAt ?? null,
      reconciledAt: data.reconciledAt ?? null,
    };
  }

  private resolveStatus(
    settlement: ProviderSettlementEvent,
    match: MatchResult | null,
    differenceAmountMinor: Prisma.Decimal | undefined,
    tolerance: Prisma.Decimal,
  ) {
    if (match?.ambiguous) return ReconciliationCaseStatus.AMBIGUOUS;
    if (!match?.payment && !match?.order) return ReconciliationCaseStatus.UNMATCHED;
    const matchedCurrency = match.payment?.currency ?? match.order?.currency;
    if (matchedCurrency !== settlement.currency) {
      return ReconciliationCaseStatus.CURRENCY_DIVERGENCE;
    }
    const providerPaymentStatus = match.payment
      ? this.normalizeProviderStatus(settlement.providerStatus)
      : null;
    if (providerPaymentStatus && providerPaymentStatus !== match.payment?.status) {
      return ReconciliationCaseStatus.STATUS_DIVERGENCE;
    }
    if (differenceAmountMinor && differenceAmountMinor.absoluteValue().gt(tolerance)) {
      return ReconciliationCaseStatus.AMOUNT_DIVERGENCE;
    }
    if (match.matchType === ReconciliationMatchType.AMOUNT_CURRENCY_TIME_CANDIDATE) {
      return ReconciliationCaseStatus.PENDING;
    }

    return ReconciliationCaseStatus.RECONCILED;
  }

  private resolveExpectedAmountMinor(match: MatchResult | null) {
    if (match?.payment) return new Prisma.Decimal(match.payment.amount);
    if (match?.order) return this.majorDecimalToMinor(match.order.revenueAmount);
    return undefined;
  }

  private resolveSettlementReceivedAmountMinor(settlement: ProviderSettlementEvent) {
    const amount = settlement.netAmountMinor ?? settlement.amountMinor;
    return amount === null || amount === undefined ? undefined : new Prisma.Decimal(amount);
  }

  private extractMarketplaceOrderReferences(settlement: ProviderSettlementEvent) {
    const references = new Set<string>();
    this.addReference(references, settlement.externalReference);

    const payload = settlement.normalizedPayload;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;
      this.addReference(references, record.externalOrderId);
      this.addReference(references, record.marketplaceOrderId);
      this.addReference(references, record.orderId);
    }

    return Array.from(references);
  }

  private addReference(references: Set<string>, value: unknown) {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    const normalized = String(value).trim();
    if (!normalized) return;
    references.add(normalized);
  }

  private majorDecimalToMinor(value: Prisma.Decimal) {
    return new Prisma.Decimal(value).mul(100).toDecimalPlaces(0);
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
