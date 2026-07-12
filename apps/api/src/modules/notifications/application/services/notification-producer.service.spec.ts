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

  it('produces an idempotent channel order shipping summary update when enabled', async () => {
    config.get.mockReturnValue('true');
    notifications.createEvent.mockResolvedValue({ created: true });

    await service.channelOrderShippingSummaryUpdated({
      tenantId: 'tenant-1',
      shippingSummaryId: 'shipping-summary-1',
      orderId: 'order-1',
      externalOrderId: '2000000001',
      externalShipmentId: '987654321',
      status: 'ready_to_ship',
      changedAt: new Date('2026-07-12T18:00:00.000Z'),
    });

    expect(notifications.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'channel.order.shipping_summary.updated',
        idempotencyKey:
          'channel-order-shipping:shipping-summary-1:updated:2026-07-12T18:00:00.000Z',
        sourceType: 'OrderShippingSummary',
        sourceId: 'shipping-summary-1',
        translationArgs: {
          orderId: 'order-1',
          externalOrderId: '2000000001',
          externalShipmentId: '987654321',
          status: 'ready_to_ship',
        },
      }),
    );
  });
});
