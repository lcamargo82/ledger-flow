import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationProducerService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async channelInventorySyncFailed(input: {
    tenantId: string;
    syncStateId: string;
    listingId: string;
    attempt: number;
  }) {
    if (!this.isEnabled()) return;

    await this.notifications.createEvent({
      tenantId: input.tenantId,
      eventType: 'channel.inventory_sync.failed',
      idempotencyKey: `channel-sync:${input.syncStateId}:failed:${input.attempt}`,
      sourceType: 'ChannelInventorySyncState',
      sourceId: input.syncStateId,
      occurredAt: new Date(),
      translationArgs: { listingId: input.listingId },
    });
  }

  async reconciliationDivergence(input: { tenantId: string; caseId: string }) {
    if (!this.isEnabled()) return;

    await this.notifications.createEvent({
      tenantId: input.tenantId,
      eventType: 'reconciliation.case.divergent',
      idempotencyKey: `reconciliation-case:${input.caseId}:divergent`,
      sourceType: 'ReconciliationCase',
      sourceId: input.caseId,
      occurredAt: new Date(),
      translationArgs: { caseId: input.caseId },
    });
  }

  async marketplaceSettlementEventReceived(input: {
    tenantId: string;
    settlementEventId: string;
    operationalFinancialAccountId?: string | null;
    provider: string;
    providerEventId: string;
    providerPaymentId?: string | null;
    netAmountMinor?: string | null;
    currency: string;
  }) {
    if (!this.isEnabled()) return;

    await this.notifications.createEvent({
      tenantId: input.tenantId,
      eventType: 'marketplace_settlement.event_received',
      idempotencyKey: `marketplace-settlement:${input.settlementEventId}:received`,
      sourceType: 'ProviderSettlementEvent',
      sourceId: input.settlementEventId,
      occurredAt: new Date(),
      translationArgs: {
        provider: input.provider,
        providerPaymentId: input.providerPaymentId ?? null,
        netAmountMinor: input.netAmountMinor ?? null,
        currency: input.currency,
      },
      metadata: {
        operationalFinancialAccountId: input.operationalFinancialAccountId ?? null,
        provider: input.provider,
        providerEventId: input.providerEventId,
        providerPaymentId: input.providerPaymentId ?? null,
      },
    });
  }

  async cashPositionUnexplainedDifference(input: {
    tenantId: string;
    accountId: string;
    differenceAmountMinor: string;
    currency: string;
    detectedAt: Date;
  }) {
    if (!this.isEnabled()) return;

    await this.notifications.createEvent({
      tenantId: input.tenantId,
      eventType: 'cash_position.unexplained_difference',
      idempotencyKey: `cash-position:${input.accountId}:${input.differenceAmountMinor}:${input.detectedAt.toISOString()}`,
      sourceType: 'OperationalFinancialAccount',
      sourceId: input.accountId,
      occurredAt: input.detectedAt,
      translationArgs: {
        differenceAmountMinor: input.differenceAmountMinor,
        currency: input.currency,
      },
      metadata: {
        accountId: input.accountId,
      },
    });
  }

  async channelOrderShippingSummaryUpdated(input: {
    tenantId: string;
    shippingSummaryId: string;
    orderId: string;
    externalOrderId: string;
    externalShipmentId?: string | null;
    status?: string | null;
    changedAt: Date;
  }) {
    if (!this.isEnabled()) return;

    const status = input.status?.trim();
    if (!status || status === 'UNKNOWN') return;

    await this.notifications.createEvent({
      tenantId: input.tenantId,
      eventType: 'channel.order.shipping_summary.updated',
      idempotencyKey: `channel-order-shipping:${input.shippingSummaryId}:updated:${input.changedAt.toISOString()}`,
      sourceType: 'OrderShippingSummary',
      sourceId: input.shippingSummaryId,
      occurredAt: input.changedAt,
      translationArgs: {
        orderId: input.orderId,
        externalOrderId: input.externalOrderId,
        externalShipmentId: input.externalShipmentId ?? null,
        status,
      },
      metadata: {
        orderId: input.orderId,
        externalOrderId: input.externalOrderId,
        externalShipmentId: input.externalShipmentId ?? null,
        status,
      },
    });
  }

  async saleConfirmed(input: {
    tenantId: string;
    orderId: string;
    externalOrderId: string;
    buyerName?: string | null;
    productName?: string | null;
    quantity: number;
    valueAmount?: string | null;
    currency?: string | null;
    paymentStatus?: string | null;
    shippingMode?: string | null;
    logisticType?: string | null;
    handlingEstimateAt?: Date | null;
    deliveryEstimateAt?: Date | null;
    postedAt?: Date | null;
  }) {
    if (!this.isEnabled()) return;

    await this.notifications.createEvent({
      tenantId: input.tenantId,
      eventType: 'sale.confirmed',
      idempotencyKey: `sale-confirmed:${input.orderId}`,
      sourceType: 'InternalOrder',
      sourceId: input.orderId,
      occurredAt: new Date(),
      translationArgs: {
        orderId: input.orderId,
        externalOrderId: input.externalOrderId,
        buyerName: input.buyerName ?? null,
        productName: input.productName ?? null,
        quantity: input.quantity,
        valueAmount: input.valueAmount ?? null,
        currency: input.currency ?? 'BRL',
        paymentStatus: input.paymentStatus ?? null,
        shippingMode: input.shippingMode ?? null,
        logisticType: input.logisticType ?? null,
        handlingEstimateAt: input.handlingEstimateAt?.toISOString() ?? null,
        deliveryEstimateAt: input.deliveryEstimateAt?.toISOString() ?? null,
        postedAt: input.postedAt?.toISOString() ?? null,
      },
      metadata: {
        orderId: input.orderId,
        externalOrderId: input.externalOrderId,
      },
    });
  }

  async mercadoPagoConnectionReauthRequired(input: {
    tenantId: string;
    gatewayConfigurationId: string;
  }) {
    if (!this.isEnabled()) return;

    await this.notifications.createEvent({
      tenantId: input.tenantId,
      eventType: 'mercado_pago.connection_reauth_required',
      idempotencyKey: `mercado-pago:${input.gatewayConfigurationId}:reauth-required`,
      sourceType: 'GatewayConfiguration',
      sourceId: input.gatewayConfigurationId,
      occurredAt: new Date(),
      translationArgs: {
        provider: 'Mercado Pago',
      },
      metadata: {
        provider: 'MERCADO_PAGO',
      },
    });
  }

  async mercadoPagoPaymentStatusUpdated(input: {
    tenantId: string;
    paymentId: string;
    paymentReference: string;
    previousStatus: string;
    currentStatus: string;
    providerPaymentId?: string | null;
    providerEventId: string;
  }) {
    if (!this.isEnabled()) return;

    await this.notifications.createEvent({
      tenantId: input.tenantId,
      eventType: 'mercado_pago.payment_status_updated',
      idempotencyKey: `mercado-pago-payment:${input.paymentId}:${input.currentStatus}:${input.providerEventId}`,
      sourceType: 'Payment',
      sourceId: input.paymentId,
      occurredAt: new Date(),
      translationArgs: {
        paymentReference: input.paymentReference,
        previousStatus: input.previousStatus,
        currentStatus: input.currentStatus,
      },
      metadata: {
        provider: 'MERCADO_PAGO',
        paymentId: input.paymentId,
        providerPaymentId: input.providerPaymentId ?? null,
      },
    });
  }

  private isEnabled() {
    return this.config.get<string>('NOTIFICATIONS_INTERNAL_PRODUCERS_ENABLED') === 'true';
  }
}
