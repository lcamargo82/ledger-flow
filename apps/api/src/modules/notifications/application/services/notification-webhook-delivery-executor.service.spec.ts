import { NotificationWebhookDeliveryStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { NotificationWebhookDeliveryExecutorService } from './notification-webhook-delivery-executor.service';

describe('NotificationWebhookDeliveryExecutorService', () => {
  const now = new Date('2026-07-11T22:00:00.000Z');
  const delivery = {
    id: 'delivery-1',
    tenantId: 'tenant-1',
    status: NotificationWebhookDeliveryStatus.PENDING,
    idempotencyKey: 'subscription-1:event-1',
    attemptCount: 0,
    maxAttempts: 8,
    subscription: {
      id: 'subscription-1',
      endpointUrl: 'https://automation.example.com/ledgerflow',
      encryptedSecretJson: { ciphertext: 'encrypted' },
      status: 'ACTIVE',
    },
    notificationEvent: {
      id: 'event-1',
      eventType: 'channel.inventory_sync.failed',
      category: 'CHANNELS',
      severity: 'ERROR',
      sourceType: 'ChannelInventorySyncState',
      sourceId: 'sync-1',
      occurredAt: now,
      translationArgsJson: { listingId: 'listing-1' },
    },
  };
  const transaction = {
    notificationWebhookDelivery: { update: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const prisma = {
    notificationWebhookDelivery: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  const endpointPolicy = { assertSafe: jest.fn() };
  const secrets = { decrypt: jest.fn() };
  const signer = { sign: jest.fn() };
  const config = { get: jest.fn() };
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let service: NotificationWebhookDeliveryExecutorService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    fetchMock = jest.spyOn(global, 'fetch');
    prisma.notificationWebhookDelivery.findUnique.mockResolvedValue(delivery);
    prisma.notificationWebhookDelivery.update.mockResolvedValue({ ...delivery, attemptCount: 1 });
    prisma.notificationWebhookDelivery.updateMany.mockResolvedValue({ count: 1 });
    endpointPolicy.assertSafe.mockResolvedValue(delivery.subscription.endpointUrl);
    secrets.decrypt.mockReturnValue('webhook-secret');
    signer.sign.mockReturnValue({ timestamp: '1783807200', signature: 'v1=digest' });
    config.get.mockReturnValue(undefined);
    service = new NotificationWebhookDeliveryExecutorService(
      prisma as never,
      endpointPolicy as never,
      secrets as never,
      signer,
      config as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('signs and delivers a sanitized payload without exposing the secret', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 } as Response);

    await service.execute('delivery-1', 1);

    const rawBody = JSON.stringify({
      id: 'event-1',
      type: 'channel.inventory_sync.failed',
      category: 'CHANNELS',
      severity: 'ERROR',
      occurredAt: now.toISOString(),
      source: { type: 'ChannelInventorySyncState', id: 'sync-1' },
      data: { listingId: 'listing-1' },
    });
    expect(signer.sign).toHaveBeenCalledWith(rawBody, 'webhook-secret');
    expect(prisma.notificationWebhookDelivery.updateMany).toHaveBeenCalledWith({
      where: {
        id: delivery.id,
        attemptCount: 0,
        status: { in: ['PENDING', 'RETRY_SCHEDULED'] },
      },
      data: {
        status: NotificationWebhookDeliveryStatus.PROCESSING,
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestedUrl, request] = fetchMock.mock.calls[0];
    expect(requestedUrl).toBe(delivery.subscription.endpointUrl);
    expect(request?.method).toBe('POST');
    expect(request?.redirect).toBe('error');
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    expect(request?.headers).toEqual({
      'Content-Type': 'application/json',
      'User-Agent': 'LedgerFlow-Webhook/1.0',
      'Idempotency-Key': delivery.idempotencyKey,
      'X-LedgerFlow-Delivery-Id': delivery.id,
      'X-LedgerFlow-Timestamp': '1783807200',
      'X-LedgerFlow-Signature': 'v1=digest',
    });
    expect(request?.body).toBe(rawBody);
    expect(prisma.notificationWebhookDelivery.update).toHaveBeenLastCalledWith({
      where: { id: delivery.id },
      data: {
        status: NotificationWebhookDeliveryStatus.DELIVERED,
        deliveredAt: now,
        responseStatusCode: 204,
        errorCode: null,
        nextAttemptAt: null,
      },
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('webhook-secret');
  });

  it('ignores a duplicate message for an attempt already processed', async () => {
    prisma.notificationWebhookDelivery.findUnique.mockResolvedValue({
      ...delivery,
      status: NotificationWebhookDeliveryStatus.RETRY_SCHEDULED,
      attemptCount: 1,
    });

    await service.execute('delivery-1', 1);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.notificationWebhookDelivery.update).not.toHaveBeenCalled();
  });

  it('does not send when another worker wins the atomic attempt claim', async () => {
    prisma.notificationWebhookDelivery.updateMany.mockResolvedValue({ count: 0 });

    await service.execute('delivery-1', 1);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resumes the same idempotent attempt after a worker crash left it processing', async () => {
    prisma.notificationWebhookDelivery.findUnique.mockResolvedValue({
      ...delivery,
      status: NotificationWebhookDeliveryStatus.PROCESSING,
      attemptCount: 1,
    });
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    await service.execute('delivery-1', 1);

    expect(prisma.notificationWebhookDelivery.updateMany).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('schedules a durable retry with exponential backoff for a transient response', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response);
    const retryPayload = { deliveryId: 'delivery-1', attempt: 2 };

    await service.execute('delivery-1', 1);

    expect(transaction.notificationWebhookDelivery.update).toHaveBeenCalledWith({
      where: { id: delivery.id },
      data: {
        status: NotificationWebhookDeliveryStatus.RETRY_SCHEDULED,
        responseStatusCode: 503,
        errorCode: 'HTTP_503',
        nextAttemptAt: new Date('2026-07-11T22:00:24.000Z'),
      },
    });
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        tenantId: delivery.tenantId,
        aggregateType: 'NotificationWebhookDelivery',
        aggregateId: delivery.id,
        eventType: 'notification.webhook.delivery_requested',
        eventVersion: 1,
        payload: retryPayload,
        payloadHash: createHash('sha256').update(JSON.stringify(retryPayload)).digest('hex'),
        availableAt: new Date('2026-07-11T22:00:24.000Z'),
      },
    });
  });

  it('moves a permanent client response to the application DLQ without broker retry', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 } as Response);

    await service.execute('delivery-1', 1);

    expect(prisma.notificationWebhookDelivery.update).toHaveBeenLastCalledWith({
      where: { id: delivery.id },
      data: {
        status: NotificationWebhookDeliveryStatus.DLQ,
        responseStatusCode: 400,
        errorCode: 'HTTP_400',
        nextAttemptAt: null,
      },
    });
    expect(transaction.outboxEvent.create).not.toHaveBeenCalled();
  });
});
