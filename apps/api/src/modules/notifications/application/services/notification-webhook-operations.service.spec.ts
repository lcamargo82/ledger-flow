import { ConflictException, NotFoundException } from '@nestjs/common';
import { NotificationWebhookDeliveryStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { NotificationWebhookOperationsService } from './notification-webhook-operations.service';

describe('NotificationWebhookOperationsService', () => {
  const now = new Date('2026-07-11T23:00:00.000Z');
  const subscription = { id: 'subscription-1', tenantId: 'tenant-1', status: 'ACTIVE' };
  const delivery = {
    id: 'delivery-1',
    tenantId: 'tenant-1',
    subscriptionId: subscription.id,
    status: NotificationWebhookDeliveryStatus.DLQ,
    attemptCount: 8,
    maxAttempts: 8,
    nextAttemptAt: null,
    lastAttemptAt: now,
    deliveredAt: null,
    responseStatusCode: 503,
    errorCode: 'HTTP_503',
    createdAt: now,
    updatedAt: now,
  };
  const transaction = {
    notificationEvent: { create: jest.fn() },
    notificationWebhookDelivery: { create: jest.fn(), updateMany: jest.fn() },
    outboxEvent: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    notificationWebhookSubscription: { findFirst: jest.fn() },
    notificationWebhookDelivery: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  let service: NotificationWebhookOperationsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    prisma.notificationWebhookSubscription.findFirst.mockResolvedValue(subscription);
    transaction.notificationEvent.create.mockResolvedValue({ id: 'event-test-1' });
    transaction.notificationWebhookDelivery.create.mockResolvedValue({
      ...delivery,
      id: 'delivery-test-1',
      status: NotificationWebhookDeliveryStatus.PENDING,
      attemptCount: 0,
      responseStatusCode: null,
      errorCode: null,
    });
    transaction.notificationWebhookDelivery.updateMany.mockResolvedValue({ count: 1 });
    service = new NotificationWebhookOperationsService(prisma as never);
  });

  afterEach(() => jest.useRealTimers());

  it('creates an isolated test delivery and its outbox request atomically', async () => {
    const result = await service.test('tenant-1', 'user-1', subscription.id);
    const payload = { deliveryId: 'delivery-test-1', attempt: 1 };

    const eventCreateCall = JSON.stringify(transaction.notificationEvent.create.mock.calls);
    expect(eventCreateCall).toContain('"eventType":"notification.webhook.test"');
    expect(eventCreateCall).toContain('"idempotencyKey":"webhook-test:subscription-1:');
    expect(eventCreateCall).toContain('"requiredCapabilities":["notifications.manage"]');
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        aggregateType: 'NotificationWebhookDelivery',
        aggregateId: 'delivery-test-1',
        eventType: 'notification.webhook.delivery_requested',
        eventVersion: 1,
        payload,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'notifications.webhook.test_requested',
        entityType: 'NotificationWebhookDelivery',
        entityId: 'delivery-test-1',
        metadata: { subscriptionId: subscription.id },
      },
    });
    expect(result.delivery).not.toHaveProperty('idempotencyKey');
  });

  it('does not reveal whether a subscription belongs to another tenant', async () => {
    prisma.notificationWebhookSubscription.findFirst.mockResolvedValue(null);

    await expect(service.test('tenant-2', 'user-2', subscription.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replays only a tenant-owned DLQ delivery with an atomic state claim', async () => {
    prisma.notificationWebhookDelivery.findFirst.mockResolvedValue(delivery);

    const result = await service.replay('tenant-1', 'user-1', subscription.id, delivery.id);
    const payload = { deliveryId: delivery.id, attempt: 1 };

    expect(transaction.notificationWebhookDelivery.updateMany).toHaveBeenCalledWith({
      where: {
        id: delivery.id,
        tenantId: 'tenant-1',
        subscriptionId: subscription.id,
        status: NotificationWebhookDeliveryStatus.DLQ,
      },
      data: {
        status: NotificationWebhookDeliveryStatus.PENDING,
        attemptCount: 0,
        nextAttemptAt: null,
        lastAttemptAt: null,
        deliveredAt: null,
        responseStatusCode: null,
        errorCode: null,
      },
    });
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        aggregateType: 'NotificationWebhookDelivery',
        aggregateId: delivery.id,
        eventType: 'notification.webhook.delivery_requested',
        eventVersion: 1,
        payload,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'notifications.webhook.delivery_replayed',
        entityType: 'NotificationWebhookDelivery',
        entityId: delivery.id,
        metadata: { subscriptionId: subscription.id },
      },
    });
    expect(result.delivery.status).toBe(NotificationWebhookDeliveryStatus.PENDING);
  });

  it('rejects replay when another request already claimed the DLQ delivery', async () => {
    prisma.notificationWebhookDelivery.findFirst.mockResolvedValue(delivery);
    transaction.notificationWebhookDelivery.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.replay('tenant-1', 'user-1', subscription.id, delivery.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.outboxEvent.create).not.toHaveBeenCalled();
  });

  it('returns sanitized recent deliveries and status counts scoped to the tenant', async () => {
    prisma.notificationWebhookDelivery.groupBy.mockResolvedValue([
      { status: NotificationWebhookDeliveryStatus.DLQ, _count: { status: 1 } },
    ]);
    prisma.notificationWebhookDelivery.findMany.mockResolvedValue([delivery]);

    const result = await service.list('tenant-1', subscription.id, 20);

    expect(prisma.notificationWebhookDelivery.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    expect(result.counts.DLQ).toBe(1);
    expect(result.data[0]).not.toHaveProperty('idempotencyKey');
    expect(result.data[0]).not.toHaveProperty('notificationEvent');
  });
});
