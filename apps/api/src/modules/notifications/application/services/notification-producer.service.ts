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

  private isEnabled() {
    return this.config.get<string>('NOTIFICATIONS_INTERNAL_PRODUCERS_ENABLED') === 'true';
  }
}
