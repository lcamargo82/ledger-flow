import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CashLedgerEntryType,
  InventoryMovementType,
  NotificationSeverity,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ListSalesIntelligenceQueryDto } from '../dto/list-sales-intelligence-query.dto';
import { SalesIntelligenceRowDto } from '../dto/sales-intelligence-response.dto';
import {
  SalesIntelligenceNetAmountSource,
  SalesIntelligenceStockStatus,
} from '../../domain/enums/sales-intelligence.enums';
import {
  buildSalesIntelligenceWhere,
  salesIntelligenceOrderSelect,
} from './sales-intelligence.query';
import { mapSalesIntelligenceOrder } from './sales-intelligence.mapper';
import { salesIntelligenceDetailSelect } from './sales-intelligence-detail.query';
import {
  mapSalesIntelligenceDetail,
  resolveSalesIntelligencePermissions,
} from './sales-intelligence-detail.mapper';

interface SummaryAccumulator {
  orderCount: number;
  paid: bigint;
  fee: bigint;
  net: bigint;
  realized: bigint;
  reconciled: bigint;
  estimated: bigint;
  stockIssues: number;
  currency: string;
}

interface TimelineInventoryMovement {
  id: string;
  type: InventoryMovementType;
  occurredAt: Date;
  reasonCode: string | null;
  sourceType: string;
}

interface TimelineNotification {
  id: string;
  eventType: string;
  severity: NotificationSeverity;
  titleKey: string;
  messageKey: string;
  occurredAt: Date;
}

interface TimelineOutboxEvent {
  id: string;
  eventType: string;
  createdAt: Date;
}

interface TimelineCashEntry {
  id: string;
  type: CashLedgerEntryType;
  amountMinor: Prisma.Decimal;
  occurredAt: Date;
}

@Injectable()
export class SalesIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListSalesIntelligenceQueryDto) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 20, 100);
    const where = buildSalesIntelligenceWhere(tenantId, query);
    const [orders, total] = await Promise.all([
      this.prisma.internalOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: salesIntelligenceOrderSelect,
      }),
      this.prisma.internalOrder.count({ where }),
    ]);

    return {
      data: orders.map((order) => mapSalesIntelligenceOrder(order)),
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }

  async getSummary(tenantId: string, query: ListSalesIntelligenceQueryDto = {}) {
    const summary = this.emptySummary();
    const batchSize = 500;
    const where = buildSalesIntelligenceWhere(tenantId, query);
    let cursorId: string | undefined;

    for (;;) {
      const orders = await this.prisma.internalOrder.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(cursorId && { cursor: { id: cursorId }, skip: 1 }),
        take: batchSize,
        select: salesIntelligenceOrderSelect,
      });
      orders
        .map((order) => mapSalesIntelligenceOrder(order))
        .forEach((row) => this.addToSummary(summary, row));
      if (orders.length < batchSize) break;
      cursorId = orders.at(-1)?.id;
    }

    return this.serializeSummary(summary);
  }

  async getDetail(tenantId: string, orderId: string, userPermissions: string[]) {
    const order = await this.findDetailOrder(tenantId, orderId);
    const settlementEventIds = order.reconciliationCases.map((item) => item.settlementEvent.id);
    const cashEntries = settlementEventIds.length
      ? await this.prisma.cashLedgerEntry.findMany({
          where: {
            tenantId,
            sourceType: 'ProviderSettlementEvent',
            sourceId: { in: settlementEventIds },
          },
          select: { id: true, type: true, amountMinor: true, occurredAt: true },
          orderBy: { occurredAt: 'asc' },
        })
      : [];

    return mapSalesIntelligenceDetail(
      order,
      resolveSalesIntelligencePermissions(userPermissions),
      cashEntries,
    );
  }

  async getTimeline(tenantId: string, orderId: string, userPermissions: string[]) {
    const order = await this.findDetailOrder(tenantId, orderId);
    const permissions = resolveSalesIntelligencePermissions(userPermissions);
    const sourceIds = [
      order.id,
      ...order.items.flatMap((item) =>
        [item.id, item.reservationId].filter((id): id is string => Boolean(id)),
      ),
    ];
    const aggregateIds = [
      order.id,
      ...order.financialFacts.map((item) => item.id),
      ...order.reconciliationCases.map((item) => item.settlementEvent.id),
    ];
    const settlementEventIds = order.reconciliationCases.map((item) => item.settlementEvent.id);
    const movementsPromise: Promise<TimelineInventoryMovement[]> = permissions.canViewInventory
      ? this.prisma.inventoryMovement.findMany({
          where: { tenantId, sourceId: { in: sourceIds } },
          select: {
            id: true,
            type: true,
            occurredAt: true,
            reasonCode: true,
            sourceType: true,
          },
        })
      : Promise.resolve([]);
    const cashEntriesPromise: Promise<TimelineCashEntry[]> =
      permissions.canViewSettlement && settlementEventIds.length
        ? this.prisma.cashLedgerEntry.findMany({
            where: {
              tenantId,
              sourceType: 'ProviderSettlementEvent',
              sourceId: { in: settlementEventIds },
            },
            select: { id: true, type: true, amountMinor: true, occurredAt: true },
          })
        : Promise.resolve([]);
    const [movements, notifications, outboxEvents, cashEntries]: [
      TimelineInventoryMovement[],
      TimelineNotification[],
      TimelineOutboxEvent[],
      TimelineCashEntry[],
    ] = await Promise.all([
      movementsPromise,
      this.prisma.notificationEvent.findMany({
        where: {
          tenantId,
          OR: [
            { sourceId: { in: aggregateIds } },
            { metadataJson: { path: ['orderId'], equals: order.id } },
          ],
        },
        select: {
          id: true,
          eventType: true,
          severity: true,
          titleKey: true,
          messageKey: true,
          occurredAt: true,
        },
      }),
      this.prisma.outboxEvent.findMany({
        where: { tenantId, aggregateId: { in: aggregateIds } },
        select: { id: true, eventType: true, createdAt: true },
      }),
      cashEntriesPromise,
    ]);

    const events = this.baseTimeline(order, permissions);
    events.push(
      ...movements.map((movement) => ({
        id: movement.id,
        occurredAt: movement.occurredAt,
        source: 'INVENTORY',
        type: `inventory.${movement.type.toLowerCase()}`,
        titleKey: 'salesIntelligence.timeline.inventory.title',
        messageKey: 'salesIntelligence.timeline.inventory.message',
        severity: movement.type === 'FULFILLMENT' ? 'SUCCESS' : 'INFO',
        metadata: {
          movementType: movement.type,
          reasonCode: movement.reasonCode,
          sourceType: movement.sourceType,
        },
      })),
      ...notifications.map((notification) => ({
        id: notification.id,
        occurredAt: notification.occurredAt,
        source: 'NOTIFICATION',
        type: notification.eventType,
        titleKey: notification.titleKey,
        messageKey: notification.messageKey,
        severity: notification.severity,
        metadata: {},
      })),
      ...outboxEvents.map((event) => ({
        id: event.id,
        occurredAt: event.createdAt,
        source: 'OUTBOUND_WEBHOOK',
        type: event.eventType,
        titleKey: 'salesIntelligence.timeline.outbound.title',
        messageKey: 'salesIntelligence.timeline.outbound.message',
        severity: 'INFO',
        metadata: { eventType: event.eventType },
      })),
      ...cashEntries.map((entry) => ({
        id: entry.id,
        occurredAt: entry.occurredAt,
        source: 'SETTLEMENT',
        type: `cash.${entry.type.toLowerCase()}`,
        titleKey: 'salesIntelligence.timeline.cash.title',
        messageKey: 'salesIntelligence.timeline.cash.message',
        severity: 'SUCCESS',
        metadata: { entryType: entry.type, amountMinor: entry.amountMinor.toString() },
      })),
    );
    return events.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  }

  private findDetailOrder(tenantId: string, orderId: string) {
    return this.prisma.internalOrder
      .findFirst({ where: { id: orderId, tenantId }, select: salesIntelligenceDetailSelect })
      .then((order) => {
        if (!order) throw new NotFoundException('Sale not found.');
        return order;
      });
  }

  private baseTimeline(
    order: Awaited<ReturnType<SalesIntelligenceService['findDetailOrder']>>,
    permissions: ReturnType<typeof resolveSalesIntelligencePermissions>,
  ) {
    const events: Array<{
      id: string;
      occurredAt: Date;
      source: string;
      type: string;
      titleKey: string;
      messageKey: string;
      severity: string;
      metadata: Record<string, unknown>;
    }> = [
      {
        id: `${order.id}:created`,
        occurredAt: order.createdAt,
        source: 'ORDER',
        type: 'order.created',
        titleKey: 'salesIntelligence.timeline.orderCreated.title',
        messageKey: 'salesIntelligence.timeline.orderCreated.message',
        severity: 'INFO',
        metadata: { orderStatus: order.status },
      },
    ];
    const fact = order.financialFacts[0];
    if (permissions.canViewPayment && fact) {
      events.push({
        id: `${fact.id}:payment`,
        occurredAt: fact.calculatedAt,
        source: 'PAYMENT',
        type: 'payment.status',
        titleKey: 'salesIntelligence.timeline.payment.title',
        messageKey: 'salesIntelligence.timeline.payment.message',
        severity: fact.paymentStatus === 'approved' ? 'SUCCESS' : 'INFO',
        metadata: { paymentStatus: fact.paymentStatus },
      });
    }
    const shipping = order.shippingSummaries[0];
    if (shipping) {
      events.push({
        id: shipping.id,
        occurredAt: shipping.updatedAt,
        source: 'SHIPPING',
        type: 'shipping.status',
        titleKey: 'salesIntelligence.timeline.shipping.title',
        messageKey: 'salesIntelligence.timeline.shipping.message',
        severity: shipping.status === 'delivered' ? 'SUCCESS' : 'INFO',
        metadata: { shippingStatus: shipping.status, substatus: shipping.substatus },
      });
    }
    if (permissions.canViewSettlement) {
      for (const item of order.reconciliationCases) {
        events.push({
          id: item.settlementEvent.id,
          occurredAt: item.settlementEvent.occurredAt ?? item.settlementEvent.receivedAt,
          source: 'SETTLEMENT',
          type: `settlement.${item.status.toLowerCase()}`,
          titleKey: 'salesIntelligence.timeline.settlement.title',
          messageKey: 'salesIntelligence.timeline.settlement.message',
          severity: item.status === 'RECONCILED' ? 'SUCCESS' : 'WARNING',
          metadata: {
            settlementStatus: item.status,
            providerStatus: item.settlementEvent.providerStatus,
          },
        });
      }
    }
    return events;
  }

  private addToSummary(summary: SummaryAccumulator, row: SalesIntelligenceRowDto) {
    summary.orderCount += 1;
    summary.paid += this.minor(row.paidAmountMinor);
    summary.fee += this.minor(row.feeAmountMinor);
    summary.net += this.minor(row.netAmountMinor);
    if (row.netAmountSource === SalesIntelligenceNetAmountSource.REALIZED) {
      summary.realized += this.minor(row.netAmountMinor);
    }
    if (row.netAmountSource === SalesIntelligenceNetAmountSource.RECONCILED) {
      summary.reconciled += this.minor(row.netAmountMinor);
    }
    if (row.netAmountSource === SalesIntelligenceNetAmountSource.ESTIMATED) {
      summary.estimated += this.minor(row.netAmountMinor);
    }
    if (row.stockStatus === SalesIntelligenceStockStatus.DIVERGENT) summary.stockIssues += 1;
    summary.currency = row.currency;
  }

  private serializeSummary(summary: SummaryAccumulator) {
    return {
      orderCount: summary.orderCount,
      paidAmountMinor: summary.paid.toString(),
      feeAmountMinor: summary.fee.toString(),
      netAmountMinor: summary.net.toString(),
      realizedNetAmountMinor: summary.realized.toString(),
      reconciledNetAmountMinor: summary.reconciled.toString(),
      estimatedNetAmountMinor: summary.estimated.toString(),
      stockIssueCount: summary.stockIssues,
      currency: summary.currency,
    };
  }

  private emptySummary(): SummaryAccumulator {
    return {
      orderCount: 0,
      paid: 0n,
      fee: 0n,
      net: 0n,
      realized: 0n,
      reconciled: 0n,
      estimated: 0n,
      stockIssues: 0,
      currency: 'BRL',
    };
  }

  private minor(value: string | null | undefined) {
    return BigInt(value ?? 0);
  }
}
