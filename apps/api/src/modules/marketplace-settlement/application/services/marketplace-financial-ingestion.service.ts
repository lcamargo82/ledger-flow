import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditActorType,
  AuditSeverity,
  GatewayConfiguration,
  OperationalFinancialAccount,
  PaymentProvider,
  Prisma,
  ProviderSettlementEvent,
  WebhookProvider,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { MercadoPagoFinancialReadinessService } from '../../../gateways/application/services/mercado-pago-financial-readiness.service';
import { MercadoPagoCredentialManager } from '../../../gateways/infra/providers/mercado-pago/mercado-pago-credential.manager';
import { ReconciliationSettlementIngestionService } from '../../../reconciliation/application/services/reconciliation-settlement-ingestion.service';
import {
  ListMarketplaceSettlementEventsQueryDto,
  MarketplaceSettlementDashboardQueryDto,
  MarketplaceSettlementDashboardResponseDto,
  MarketplaceSettlementEventResponseDto,
  MarketplaceSettlementImportedTotalsDto,
  MarketplaceSettlementSyncResponseDto,
  SyncMarketplaceFinancialEventsDto,
} from '../dto/marketplace-financial-ingestion.dto';
import { MercadoPagoFinancialReadService } from './mercado-pago-financial-read.service';

type AccountWithGateway = OperationalFinancialAccount & {
  gatewayConfiguration: GatewayConfiguration;
};

@Injectable()
export class MarketplaceFinancialIngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialReadiness: MercadoPagoFinancialReadinessService,
    private readonly credentialManager: MercadoPagoCredentialManager,
    private readonly mercadoPagoReadService: MercadoPagoFinancialReadService,
    private readonly reconciliationIngestion: ReconciliationSettlementIngestionService,
  ) {}

  async syncMercadoPagoByPeriod(
    tenantId: string,
    actorUserId: string,
    accountId: string,
    dto: SyncMarketplaceFinancialEventsDto,
  ): Promise<MarketplaceSettlementSyncResponseDto> {
    const account = await this.getMercadoPagoAccount(tenantId, accountId);
    const from = new Date(dto.from);
    const to = new Date(dto.to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Invalid sync period.');
    }

    this.financialReadiness.assertSettlementReadable(account.gatewayConfiguration);
    const accessToken = await this.credentialManager.getValidAccessToken({
      tenantId,
      gatewayConfigurationId: account.gatewayConfigurationId,
      purpose: 'SETTLEMENT',
    });

    const maxPages = dto.maxPages ?? 3;
    let offset: number | undefined = 0;
    const result: MarketplaceSettlementSyncResponseDto = {
      provider: WebhookProvider.MERCADO_PAGO,
      pagesFetched: 0,
      received: 0,
      created: 0,
      duplicates: 0,
      from,
      to,
    };

    while (offset !== undefined && result.pagesFetched < maxPages) {
      const page = await this.mercadoPagoReadService.fetchPaymentEvents({
        accessToken,
        gatewayConfigurationId: account.gatewayConfigurationId,
        operationalFinancialAccountId: account.id,
        from,
        to,
        offset,
      });

      result.pagesFetched += 1;
      result.received += page.data.length;

      for (const event of page.data) {
        const ingested = await this.reconciliationIngestion.ingestNormalizedSettlement(
          tenantId,
          event,
        );

        if (ingested.created && ingested.settlementEvent) {
          result.created += 1;
          await this.emitMarketplaceEventReceived(tenantId, ingested.settlementEvent);
        } else {
          result.duplicates += 1;
        }
      }

      offset = page.nextOffset;
    }

    await this.auditSync(tenantId, actorUserId, account.id, result);
    return result;
  }

  async listEvents(
    tenantId: string,
    accountId: string,
    query: ListMarketplaceSettlementEventsQueryDto,
  ) {
    await this.assertAccountExists(tenantId, accountId);
    const page = query.page ?? 1;
    const take = Math.min(query.perPage ?? 20, 100);
    const skip = (page - 1) * take;
    const where: Prisma.ProviderSettlementEventWhereInput = {
      tenantId,
      operationalFinancialAccountId: accountId,
    };

    const [data, total] = await Promise.all([
      this.prisma.providerSettlementEvent.findMany({
        where,
        skip,
        take,
        orderBy: [{ occurredAt: 'desc' }, { receivedAt: 'desc' }],
      }),
      this.prisma.providerSettlementEvent.count({ where }),
    ]);

    return {
      data: data.map((event) => this.mapEvent(event)),
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  async getImportedTotals(
    tenantId: string,
    accountId: string,
  ): Promise<MarketplaceSettlementImportedTotalsDto> {
    await this.assertAccountExists(tenantId, accountId);
    const events = await this.prisma.providerSettlementEvent.findMany({
      where: { tenantId, operationalFinancialAccountId: accountId },
      select: {
        amountMinor: true,
        feeAmountMinor: true,
        netAmountMinor: true,
        currency: true,
      },
    });

    const totals = events.reduce(
      (acc, event) => ({
        eventCount: acc.eventCount + 1,
        grossAmountMinor: acc.grossAmountMinor.add(event.amountMinor ?? 0),
        feeAmountMinor: acc.feeAmountMinor.add(event.feeAmountMinor ?? 0),
        netAmountMinor: acc.netAmountMinor.add(event.netAmountMinor ?? 0),
        currency: event.currency || acc.currency,
      }),
      {
        eventCount: 0,
        grossAmountMinor: new Prisma.Decimal(0),
        feeAmountMinor: new Prisma.Decimal(0),
        netAmountMinor: new Prisma.Decimal(0),
        currency: 'BRL',
      },
    );

    return {
      eventCount: totals.eventCount,
      grossAmountMinor: totals.grossAmountMinor.toString(),
      feeAmountMinor: totals.feeAmountMinor.toString(),
      netAmountMinor: totals.netAmountMinor.toString(),
      currency: totals.currency,
    };
  }

  async getDashboard(
    tenantId: string,
    accountId: string,
    query: MarketplaceSettlementDashboardQueryDto,
  ): Promise<MarketplaceSettlementDashboardResponseDto> {
    const account = await this.assertAccountExists(tenantId, accountId);
    const where: Prisma.ProviderSettlementEventWhereInput = {
      tenantId,
      operationalFinancialAccountId: accountId,
      ...this.periodWhere(query),
    };
    const events = await this.prisma.providerSettlementEvent.findMany({
      where,
      select: {
        id: true,
        eventType: true,
        providerStatus: true,
        amountMinor: true,
        feeAmountMinor: true,
        netAmountMinor: true,
        currency: true,
        availableAt: true,
      },
    });
    const cases = await this.prisma.reconciliationCase.findMany({
      where: {
        tenantId,
        orderId: { not: null },
        settlementEvent: where,
      },
      select: { orderId: true },
    });
    const orderIds = Array.from(
      new Set(cases.map((reconciliationCase) => reconciliationCase.orderId).filter(Boolean)),
    ) as string[];
    const orderFacts = orderIds.length
      ? await this.prisma.orderFinancialFact.findMany({
          where: { tenantId, orderId: { in: orderIds } },
          orderBy: [{ version: 'desc' }, { calculatedAt: 'desc' }],
        })
      : [];
    const latestOrderFacts = this.latestOrderFacts(orderFacts);
    const cashPosition = this.calculateCashPosition(account, events);
    const operationalPnl = this.calculateOperationalPnl(events, latestOrderFacts, account.currency);

    return {
      cashPosition,
      operationalPnl,
      note: 'Operational management view only. This is not official accounting.',
    };
  }

  mapEvent(event: ProviderSettlementEvent): MarketplaceSettlementEventResponseDto {
    return {
      id: event.id,
      provider: event.provider,
      providerEventId: event.providerEventId,
      providerPaymentId: event.providerPaymentId,
      externalReference: event.externalReference,
      eventType: event.eventType,
      providerStatus: event.providerStatus,
      amountMinor: event.amountMinor?.toString() ?? null,
      feeAmountMinor: event.feeAmountMinor?.toString() ?? null,
      netAmountMinor: event.netAmountMinor?.toString() ?? null,
      currency: event.currency,
      occurredAt: event.occurredAt,
      availableAt: event.availableAt,
      receivedAt: event.receivedAt,
    };
  }

  private async getMercadoPagoAccount(
    tenantId: string,
    accountId: string,
  ): Promise<AccountWithGateway> {
    const account = await this.prisma.operationalFinancialAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
        provider: PaymentProvider.MERCADO_PAGO,
      },
      include: { gatewayConfiguration: true },
    });

    if (!account) {
      throw new NotFoundException('Mercado Pago financial account not found.');
    }

    return account as AccountWithGateway;
  }

  private async assertAccountExists(tenantId: string, accountId: string) {
    const account = await this.prisma.operationalFinancialAccount.findFirst({
      where: { id: accountId, tenantId },
      select: {
        id: true,
        openingBalanceMinor: true,
        currentBalanceMinor: true,
        currency: true,
      },
    });
    if (!account) {
      throw new NotFoundException('Financial account not found.');
    }
    return account;
  }

  private periodWhere(
    query: MarketplaceSettlementDashboardQueryDto,
  ): Prisma.ProviderSettlementEventWhereInput {
    if (!query.dateFrom && !query.dateTo) return {};

    return {
      occurredAt: {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      },
    };
  }

  private calculateCashPosition(
    account: {
      openingBalanceMinor: Prisma.Decimal;
      currentBalanceMinor: Prisma.Decimal;
      currency: string;
    },
    events: Array<{
      eventType: string;
      providerStatus: string | null;
      amountMinor: Prisma.Decimal | null;
      netAmountMinor: Prisma.Decimal | null;
      availableAt: Date | null;
    }>,
  ) {
    const now = new Date();
    const totals = events.reduce(
      (acc, event) => {
        const amount = this.eventCashAmount(event);
        if (this.isRefundEvent(event)) {
          acc.refundedAmountMinor = acc.refundedAmountMinor.add(amount.abs());
          return acc;
        }
        if (this.isPayoutEvent(event)) {
          acc.payoutAmountMinor = acc.payoutAmountMinor.add(amount.abs());
          return acc;
        }
        if (this.isBlockedEvent(event)) {
          acc.blockedAmountMinor = acc.blockedAmountMinor.add(amount);
          return acc;
        }
        if (event.availableAt && event.availableAt.getTime() <= now.getTime()) {
          acc.releasedAmountMinor = acc.releasedAmountMinor.add(amount);
          return acc;
        }
        acc.pendingAmountMinor = acc.pendingAmountMinor.add(amount);
        return acc;
      },
      {
        releasedAmountMinor: new Prisma.Decimal(0),
        pendingAmountMinor: new Prisma.Decimal(0),
        blockedAmountMinor: new Prisma.Decimal(0),
        refundedAmountMinor: new Prisma.Decimal(0),
        payoutAmountMinor: new Prisma.Decimal(0),
      },
    );

    return {
      openingBalanceMinor: account.openingBalanceMinor.toString(),
      currentBalanceMinor: account.currentBalanceMinor.toString(),
      releasedAmountMinor: totals.releasedAmountMinor.toString(),
      pendingAmountMinor: totals.pendingAmountMinor.toString(),
      blockedAmountMinor: totals.blockedAmountMinor.toString(),
      refundedAmountMinor: totals.refundedAmountMinor.toString(),
      payoutAmountMinor: totals.payoutAmountMinor.toString(),
      currency: account.currency,
    };
  }

  private calculateOperationalPnl(
    events: Array<{
      eventType: string;
      providerStatus: string | null;
      amountMinor: Prisma.Decimal | null;
      feeAmountMinor: Prisma.Decimal | null;
      netAmountMinor: Prisma.Decimal | null;
      currency: string;
    }>,
    orderFacts: Array<{
      orderId: string;
      revenueAmount: Prisma.Decimal;
      cogsAmount: Prisma.Decimal;
      components: Prisma.JsonValue;
    }>,
    currency: string,
  ) {
    const eventTotals = events.reduce(
      (acc, event) => {
        if (this.isRefundEvent(event)) {
          acc.refundAmountMinor = acc.refundAmountMinor.add(this.eventCashAmount(event).abs());
          return acc;
        }
        acc.feeAmountMinor = acc.feeAmountMinor.add(event.feeAmountMinor ?? 0);
        return acc;
      },
      {
        feeAmountMinor: new Prisma.Decimal(0),
        refundAmountMinor: new Prisma.Decimal(0),
      },
    );
    const factTotals = orderFacts.reduce(
      (acc, fact) => {
        acc.grossRevenueMinor = acc.grossRevenueMinor.add(this.majorToMinor(fact.revenueAmount));
        acc.cogsAmountMinor = acc.cogsAmountMinor.add(this.majorToMinor(fact.cogsAmount));
        acc.shippingAmountMinor = acc.shippingAmountMinor.add(this.shippingMinor(fact.components));
        return acc;
      },
      {
        grossRevenueMinor: new Prisma.Decimal(0),
        cogsAmountMinor: new Prisma.Decimal(0),
        shippingAmountMinor: new Prisma.Decimal(0),
      },
    );
    const grossRevenueMinor = factTotals.grossRevenueMinor.isZero()
      ? events.reduce((sum, event) => sum.add(event.amountMinor ?? 0), new Prisma.Decimal(0))
      : factTotals.grossRevenueMinor;
    const netRevenueMinor = grossRevenueMinor
      .sub(eventTotals.feeAmountMinor)
      .sub(eventTotals.refundAmountMinor);
    const grossMarginMinor = netRevenueMinor
      .sub(factTotals.cogsAmountMinor)
      .sub(factTotals.shippingAmountMinor);

    return {
      grossRevenueMinor: grossRevenueMinor.toString(),
      feeAmountMinor: eventTotals.feeAmountMinor.toString(),
      shippingAmountMinor: factTotals.shippingAmountMinor.toString(),
      refundAmountMinor: eventTotals.refundAmountMinor.toString(),
      cogsAmountMinor: factTotals.cogsAmountMinor.toString(),
      netRevenueMinor: netRevenueMinor.toString(),
      grossMarginMinor: grossMarginMinor.toString(),
      matchedOrderCount: orderFacts.length,
      currency,
    };
  }

  private latestOrderFacts<T extends { orderId: string }>(facts: T[]): T[] {
    const seen = new Set<string>();
    return facts.filter((fact) => {
      if (seen.has(fact.orderId)) return false;
      seen.add(fact.orderId);
      return true;
    });
  }

  private eventCashAmount(event: {
    amountMinor: Prisma.Decimal | null;
    netAmountMinor: Prisma.Decimal | null;
  }) {
    return event.netAmountMinor ?? event.amountMinor ?? new Prisma.Decimal(0);
  }

  private isRefundEvent(event: { eventType: string; providerStatus: string | null }) {
    return (
      event.eventType.toLowerCase().includes('refund') ||
      event.providerStatus?.toLowerCase() === 'refunded'
    );
  }

  private isPayoutEvent(event: { eventType: string }) {
    return event.eventType.toLowerCase().includes('payout');
  }

  private isBlockedEvent(event: { providerStatus: string | null }) {
    const status = event.providerStatus?.toLowerCase();
    return Boolean(
      status && ['pending', 'in_process', 'in_mediation', 'charged_back'].includes(status),
    );
  }

  private majorToMinor(value: Prisma.Decimal) {
    return new Prisma.Decimal(value).mul(100).toDecimalPlaces(0);
  }

  private shippingMinor(components: Prisma.JsonValue) {
    if (!components || typeof components !== 'object' || Array.isArray(components)) {
      return new Prisma.Decimal(0);
    }
    const freight = (components as Record<string, unknown>).freight;
    if (!freight || typeof freight !== 'object' || Array.isArray(freight)) {
      return new Prisma.Decimal(0);
    }
    const amount = (freight as Record<string, unknown>).amount;
    if (typeof amount !== 'string' && typeof amount !== 'number') {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(amount).mul(100).toDecimalPlaces(0);
  }

  private async emitMarketplaceEventReceived(
    tenantId: string,
    settlementEvent: ProviderSettlementEvent,
  ) {
    const payload = {
      providerSettlementEventId: settlementEvent.id,
      operationalFinancialAccountId: settlementEvent.operationalFinancialAccountId,
      provider: settlementEvent.provider,
      providerEventId: settlementEvent.providerEventId,
      providerPaymentId: settlementEvent.providerPaymentId,
    };

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'ProviderSettlementEvent',
        aggregateId: settlementEvent.id,
        eventType: 'marketplace_settlement.event_received',
        eventVersion: 1,
        payload,
        payloadHash: this.hash(payload),
      },
    });
  }

  private async auditSync(
    tenantId: string,
    actorUserId: string,
    accountId: string,
    result: MarketplaceSettlementSyncResponseDto,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        actorType: AuditActorType.USER,
        severity: AuditSeverity.INFO,
        source: 'marketplace-settlement',
        entityType: 'OperationalFinancialAccount',
        entityId: accountId,
        action: 'marketplace_settlement.financial_events_synced',
        summary: 'Mercado Pago financial events synchronized by period.',
        metadata: {
          ...result,
          from: result.from.toISOString(),
          to: result.to.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  private hash(payload: Record<string, unknown>) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
