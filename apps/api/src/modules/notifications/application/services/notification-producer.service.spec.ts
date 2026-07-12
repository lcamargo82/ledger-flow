import { NotificationProducerService } from './notification-producer.service';

describe('NotificationProducerService', () => {
  const notifications = { createEvent: jest.fn() };
  const config = { get: jest.fn() };
  let service: NotificationProducerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationProducerService(notifications as never, config as never);
  });

  it('does not produce events while the rollout flag is disabled', async () => {
    config.get.mockReturnValue('false');

    await service.channelInventorySyncFailed({
      tenantId: 'tenant-1',
      syncStateId: 'sync-1',
      listingId: 'listing-1',
      attempt: 3,
    });

    expect(notifications.createEvent).not.toHaveBeenCalled();
  });

  it('produces an idempotent channel failure when enabled', async () => {
    config.get.mockReturnValue('true');
    notifications.createEvent.mockResolvedValue({ created: true });

    await service.channelInventorySyncFailed({
      tenantId: 'tenant-1',
      syncStateId: 'sync-1',
      listingId: 'listing-1',
      attempt: 3,
    });

    expect(notifications.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'channel.inventory_sync.failed',
        idempotencyKey: 'channel-sync:sync-1:failed:3',
        translationArgs: { listingId: 'listing-1' },
      }),
    );
  });

  it('produces an idempotent reconciliation divergence when enabled', async () => {
    config.get.mockReturnValue('true');
    notifications.createEvent.mockResolvedValue({ created: true });

    await service.reconciliationDivergence({
      tenantId: 'tenant-1',
      caseId: 'case-1',
    });

    expect(notifications.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'reconciliation.case.divergent',
        idempotencyKey: 'reconciliation-case:case-1:divergent',
        translationArgs: { caseId: 'case-1' },
      }),
    );
  });
});
