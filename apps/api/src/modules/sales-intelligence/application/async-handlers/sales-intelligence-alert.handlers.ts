import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { SalesIntelligenceAlertService } from '../services/sales-intelligence-alert.service';

abstract class SalesIntelligenceAlertHandler implements AsyncEventHandler {
  abstract readonly eventType: string;
  abstract readonly consumerName: string;
  protected readonly logger = new Logger(SalesIntelligenceAlertHandler.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly alerts: SalesIntelligenceAlertService,
  ) {}

  async handle(input: AsyncMessageEnvelope): Promise<void> {
    const order = await this.resolveOrder(input.aggregateId);
    if (!order) return;

    try {
      await this.alerts.evaluateOrder(order.tenantId, order.orderId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `${this.consumerName} skipped sales alert evaluation orderId=${order.orderId}: ${message}`,
      );
    }
  }

  protected abstract resolveOrder(
    aggregateId: string,
  ): Promise<{ tenantId: string; orderId: string } | null>;
}

@Injectable()
export class FinancialFactSalesAlertHandler extends SalesIntelligenceAlertHandler {
  readonly eventType = 'financial.order_fact.created';
  readonly consumerName = 'FinancialFactSalesAlertHandler';

  constructor(
    prisma: PrismaService,
    alerts: SalesIntelligenceAlertService,
  ) {
    super(prisma, alerts);
  }

  protected resolveOrder(id: string) {
    return this.prisma.orderFinancialFact.findUnique({
      where: { id },
      select: { tenantId: true, orderId: true },
    });
  }
}

@Injectable()
export class ShippingSalesAlertHandler extends SalesIntelligenceAlertHandler {
  readonly eventType = 'channel.order.shipping_summary.updated';
  readonly consumerName = 'ShippingSalesAlertHandler';

  constructor(
    prisma: PrismaService,
    alerts: SalesIntelligenceAlertService,
  ) {
    super(prisma, alerts);
  }

  protected resolveOrder(id: string) {
    return this.prisma.orderShippingSummary.findUnique({
      where: { id },
      select: { tenantId: true, orderId: true },
    });
  }
}

@Injectable()
export class SettlementSalesAlertHandler extends SalesIntelligenceAlertHandler {
  readonly eventType = 'reconciliation.settlement_received';
  readonly consumerName = 'SettlementSalesAlertHandler';

  constructor(
    prisma: PrismaService,
    alerts: SalesIntelligenceAlertService,
  ) {
    super(prisma, alerts);
  }

  protected resolveOrder(id: string) {
    return this.prisma.reconciliationCase.findFirst({
      where: { settlementEventId: id, orderId: { not: null } },
      select: { tenantId: true, orderId: true },
    }) as Promise<{ tenantId: string; orderId: string } | null>;
  }
}

@Injectable()
export class InventorySalesAlertHandler extends SalesIntelligenceAlertHandler {
  readonly eventType = 'inventory.reservation.consumed';
  readonly consumerName = 'InventorySalesAlertHandler';

  constructor(
    prisma: PrismaService,
    alerts: SalesIntelligenceAlertService,
  ) {
    super(prisma, alerts);
  }

  protected resolveOrder(id: string) {
    return this.prisma.internalOrderItem.findFirst({
      where: { reservationId: id },
      select: { tenantId: true, orderId: true },
    });
  }
}
