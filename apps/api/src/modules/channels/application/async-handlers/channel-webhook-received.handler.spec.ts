import { BadRequestException } from '@nestjs/common';
import { ChannelWebhookReceivedAsyncHandler } from './channel-webhook-received.handler';

describe('ChannelWebhookReceivedAsyncHandler', () => {
  const orderIntakeService = {
    processInboxEvent: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles channel webhook received events by processing the inbox event', async () => {
    orderIntakeService.processInboxEvent.mockResolvedValue({
      orderId: 'order-1',
      status: 'CONFIRMED',
    });
    const handler = new ChannelWebhookReceivedAsyncHandler(orderIntakeService as never);

    await handler.handle({
      eventType: 'channel.webhook.received',
      messageId: 'outbox-1',
      aggregateType: 'ChannelWebhookInboxEvent',
      aggregateId: 'inbox-1',
      tenantId: 'tenant-1',
      payload: {},
      occurredAt: new Date('2026-07-04T12:00:00.000Z'),
    });

    expect(handler.eventType).toBe('channel.webhook.received');
    expect(handler.consumerName).toBe('ChannelWebhookReceivedAsyncHandler');
    expect(orderIntakeService.processInboxEvent).toHaveBeenCalledWith('inbox-1');
  });

  it('rejects messages without an aggregate id', async () => {
    const handler = new ChannelWebhookReceivedAsyncHandler(orderIntakeService as never);

    await expect(
      handler.handle({
        eventType: 'channel.webhook.received',
        messageId: 'outbox-1',
        aggregateType: 'ChannelWebhookInboxEvent',
        aggregateId: '',
        tenantId: 'tenant-1',
        payload: {},
        occurredAt: new Date('2026-07-04T12:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(orderIntakeService.processInboxEvent).not.toHaveBeenCalled();
  });
});
