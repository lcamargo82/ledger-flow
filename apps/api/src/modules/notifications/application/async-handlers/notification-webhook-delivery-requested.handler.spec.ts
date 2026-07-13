import { NotificationWebhookDeliveryRequestedHandler } from './notification-webhook-delivery-requested.handler';

describe('NotificationWebhookDeliveryRequestedHandler', () => {
  const executor = { execute: jest.fn() };
  const handler = new NotificationWebhookDeliveryRequestedHandler(executor as never);

  beforeEach(() => jest.clearAllMocks());

  it('executes the delivery attempt declared by the durable message', async () => {
    executor.execute.mockResolvedValue(undefined);

    await handler.handle({
      messageId: 'outbox-1',
      eventType: 'notification.webhook.delivery_requested',
      eventVersion: 1,
      tenantId: 'tenant-1',
      aggregateType: 'NotificationWebhookDelivery',
      aggregateId: 'delivery-1',
      occurredAt: '2026-07-11T22:00:00.000Z',
      payload: { deliveryId: 'delivery-1', attempt: 2 },
    });

    expect(executor.execute).toHaveBeenCalledWith('delivery-1', 2);
  });

  it('rejects a malformed attempt before executing external I/O', async () => {
    await expect(
      handler.handle({
        messageId: 'outbox-1',
        eventType: 'notification.webhook.delivery_requested',
        eventVersion: 1,
        aggregateType: 'NotificationWebhookDelivery',
        aggregateId: 'delivery-1',
        occurredAt: '2026-07-11T22:00:00.000Z',
        payload: { attempt: 0 },
      }),
    ).rejects.toThrow('Invalid notification webhook delivery message.');
    expect(executor.execute).not.toHaveBeenCalled();
  });
});
