import { Injectable } from '@nestjs/common';
import { InternalOrderStatus } from '@prisma/client';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { SalesIntelligenceService } from './sales-intelligence.service';
import { SalesIntelligencePolicyService } from './sales-intelligence-policy.service';
import {
  SalesIntelligenceProfitSource,
  SalesIntelligenceProfitabilityStatus,
  SalesIntelligenceStockStatus,
} from '../../domain/enums/sales-intelligence.enums';

const INTERNAL_DETAIL_PERMISSIONS = [
  'sales-intelligence:read',
  'sales-intelligence:view-profitability',
  'sales-intelligence:view-settlement',
  'payments:read',
  'inventory:read',
];

type AlertEventType =
  | 'sale.loss_detected'
  | 'sale.low_margin_detected'
  | 'sale.missing_cost_detected'
  | 'sale.stock_not_consumed'
  | 'sale.shipping_delayed'
  | 'sale.settlement_divergent'
  | 'sale.cash_release_blocked';

@Injectable()
export class SalesIntelligenceAlertService {
  constructor(
    private readonly sales: SalesIntelligenceService,
    private readonly policies: SalesIntelligencePolicyService,
    private readonly notifications: NotificationsService,
  ) {}

  async evaluateOrder(tenantId: string, orderId: string) {
    const [detail, policy] = await Promise.all([
      this.sales.getDetail(tenantId, orderId, INTERNAL_DETAIL_PERMISSIONS),
      this.policies.getPolicy(tenantId),
    ]);
    const common = {
      tenantId,
      orderId,
      orderNumber: detail.orderNumber,
      occurredAt: new Date(),
    };

    if (detail.financial?.profitabilityStatus === SalesIntelligenceProfitabilityStatus.LOSS) {
      await this.emit('sale.loss_detected', common, {
        margin: detail.financial.marginPercent,
      });
    } else if (
      detail.financial?.profitabilityStatus === SalesIntelligenceProfitabilityStatus.MISSING_COST
    ) {
      await this.emit('sale.missing_cost_detected', common);
    } else if (
      policy.lowMarginEnabled &&
      detail.financial?.marginPercent != null &&
      Number(detail.financial.marginPercent) < Number(policy.lowMarginThreshold)
    ) {
      await this.emit(
        'sale.low_margin_detected',
        common,
        {
          margin: detail.financial.marginPercent,
          threshold: policy.lowMarginThreshold,
          estimated: detail.financial.profitSource === SalesIntelligenceProfitSource.ESTIMATED,
        },
        policy.lowMarginThreshold,
      );
    }

    const alerts: Promise<unknown>[] = [];
    if (
      detail.orderStatus === InternalOrderStatus.FULFILLED &&
      detail.stockStatus !== SalesIntelligenceStockStatus.CONSUMED
    ) {
      alerts.push(this.emit('sale.stock_not_consumed', common));
    }
    if (detail.shipping?.status === 'DELAYED') {
      alerts.push(this.emit('sale.shipping_delayed', common));
    }
    if (detail.settlement?.status === 'DIVERGENT') {
      alerts.push(this.emit('sale.settlement_divergent', common));
    }
    if (detail.settlement?.cashStatus === 'BLOCKED') {
      alerts.push(this.emit('sale.cash_release_blocked', common));
    }
    await Promise.all(alerts);
  }

  private emit(
    eventType: AlertEventType,
    common: { tenantId: string; orderId: string; orderNumber: string; occurredAt: Date },
    args: Record<string, string | number | boolean | null> = {},
    discriminator = '',
  ) {
    return this.notifications.createEvent({
      tenantId: common.tenantId,
      eventType,
      idempotencyKey: `sales-intelligence:${common.orderId}:${eventType}:${discriminator}`,
      sourceType: 'InternalOrder',
      sourceId: common.orderId,
      occurredAt: common.occurredAt,
      translationArgs: { orderNumber: common.orderNumber, ...args },
      metadata: { orderId: common.orderId },
    });
  }
}
