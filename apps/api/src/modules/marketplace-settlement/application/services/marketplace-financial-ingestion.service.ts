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
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException('Financial account not found.');
    }
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
