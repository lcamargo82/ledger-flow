import { OutboxDispatcherService } from './outbox-dispatcher.service';

describe('OutboxDispatcherService', () => {
  const event = {
    id: 'event-1',
    eventType: 'marketplace_settlement.event_received',
    eventVersion: 1,
    tenantId: 'tenant-1',
    aggregateType: 'MarketplaceSettlementEvent',
    aggregateId: 'settlement-1',
    traceId: null,
    createdAt: new Date('2026-07-14T12:00:00.000Z'),
    payload: {},
  };
  const repository = {
    findPendingAndLock: jest.fn(),
    markAsPublished: jest.fn(),
    releaseLock: jest.fn(),
  };
  const publisher = { publish: jest.fn() };
  const registry = { hasHandlers: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('finalizes audit-only events without publishing them to RabbitMQ', async () => {
    repository.findPendingAndLock.mockResolvedValue([event]);
    registry.hasHandlers.mockReturnValue(false);
    const service = new OutboxDispatcherService(repository as never, publisher, registry as never);

    await (service as unknown as { processOutbox(): Promise<void> }).processOutbox();

    expect(repository.markAsPublished).toHaveBeenCalledWith('event-1');
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(repository.releaseLock).not.toHaveBeenCalled();
  });

  it('publishes events that have registered async handlers', async () => {
    repository.findPendingAndLock.mockResolvedValue([
      { ...event, eventType: 'channel.webhook.received' },
    ]);
    registry.hasHandlers.mockReturnValue(true);
    publisher.publish.mockResolvedValue(true);
    const service = new OutboxDispatcherService(repository as never, publisher, registry as never);

    await (service as unknown as { processOutbox(): Promise<void> }).processOutbox();

    expect(publisher.publish).toHaveBeenCalledWith(
      'channel.webhook.received',
      expect.objectContaining({ messageId: 'event-1', tenantId: 'tenant-1' }),
    );
    expect(repository.markAsPublished).toHaveBeenCalledWith('event-1');
  });
});
