import { createHash } from 'crypto';
import { NotificationWebhookDeliveryPlannerService } from './notification-webhook-delivery-planner.service';

describe('NotificationWebhookDeliveryPlannerService', () => {
  const transaction = {
    notificationWebhookSubscription: { findMany: jest.fn() },
    notificationWebhookDelivery: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const service = new NotificationWebhookDeliveryPlannerService();

  beforeEach(() => jest.clearAllMocks());

  it('creates one durable and sanitized outbox request per matching active subscription', async () => {
    transaction.notificationWebhookSubscription.findMany.mockResolvedValue([
      { id: 'subscription-1' },
    ]);
    transaction.notificationWebhookDelivery.create.mockResolvedValue({ id: 'delivery-1' });

    await expect(
      service.plan(transaction as never, {
        tenantId: 'tenant-1',
        notificationEventId: 'event-1',
        eventType: 'channel.inventory_sync.failed',
      }),
    ).resolves.toEqual({ scheduled: 1 });

    expect(transaction.notificationWebhookSubscription.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        eventTypes: { has: 'channel.inventory_sync.failed' },
      },
      select: { id: true },
    });
    expect(transaction.notificationWebhookDelivery.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        subscriptionId: 'subscription-1',
        notificationEventId: 'event-1',
        idempotencyKey: 'subscription-1:event-1',
      },
    });
    const payload = { deliveryId: 'delivery-1', attempt: 1 };
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        aggregateType: 'NotificationWebhookDelivery',
        aggregateId: 'delivery-1',
        eventType: 'notification.webhook.delivery_requested',
        eventVersion: 1,
        payload,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
    expect(JSON.stringify(transaction.outboxEvent.create.mock.calls)).not.toContain('secret');
  });

  it('does not create work when there are no matching subscriptions', async () => {
    transaction.notificationWebhookSubscription.findMany.mockResolvedValue([]);

    await expect(
      service.plan(transaction as never, {
        tenantId: 'tenant-1',
        notificationEventId: 'event-1',
        eventType: 'reconciliation.case.divergent',
      }),
    ).resolves.toEqual({ scheduled: 0 });
    expect(transaction.notificationWebhookDelivery.create).not.toHaveBeenCalled();
    expect(transaction.outboxEvent.create).not.toHaveBeenCalled();
  });
});
