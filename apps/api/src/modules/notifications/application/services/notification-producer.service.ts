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
        status: input.status ?? null,
      },
      metadata: {
        orderId: input.orderId,
        externalOrderId: input.externalOrderId,
        externalShipmentId: input.externalShipmentId ?? null,
        status: input.status ?? null,
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
