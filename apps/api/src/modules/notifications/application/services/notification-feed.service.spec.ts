import { NotificationFeedService } from './notification-feed.service';

describe('NotificationFeedService', () => {
  const prisma = {
    notificationRecipient: {
      findMany: jest.fn<(args: unknown) => Promise<unknown[]>>(),
      count: jest.fn<(args: unknown) => Promise<number>>(),
      updateMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
    },
  };
  const accessPolicy = { getVisibleEventTypes: jest.fn() };
  let service: NotificationFeedService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationFeedService(prisma as never, accessPolicy as never);
    accessPolicy.getVisibleEventTypes.mockResolvedValue(['channel.inventory_sync.failed']);
  });

  it('lists only recipients owned by the current tenant and user with visible event types', async () => {
    let findManyArgs: unknown;
    prisma.notificationRecipient.findMany.mockImplementation((args) => {
      findManyArgs = args;
      return Promise.resolve([]);
    });

    await service.list('tenant-1', 'user-1', { limit: 20, unread: true });

    expect(findManyArgs).toMatchObject({
      where: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        dismissedAt: null,
        readAt: null,
        notificationEvent: { eventType: { in: ['channel.inventory_sync.failed'] } },
      },
      take: 21,
    });
  });

  it('suppresses technical shipping summary events from the user feed', async () => {
    accessPolicy.getVisibleEventTypes.mockResolvedValueOnce([
      'channel.inventory_sync.failed',
      'channel.order.shipping_summary.updated',
    ]);
    let findManyArgs: unknown;
    prisma.notificationRecipient.findMany.mockImplementation((args) => {
      findManyArgs = args;
      return Promise.resolve([]);
    });

    await service.list('tenant-1', 'user-1', { limit: 20 });

    expect(findManyArgs).toMatchObject({
      where: {
        notificationEvent: { eventType: { in: ['channel.inventory_sync.failed'] } },
      },
    });
  });

  it('uses the same visibility policy for unread count', async () => {
    prisma.notificationRecipient.count.mockResolvedValue(2);

    await expect(service.unreadCount('tenant-1', 'user-1')).resolves.toEqual({ count: 2 });
    expect(prisma.notificationRecipient.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        dismissedAt: null,
        readAt: null,
        notificationEvent: { eventType: { in: ['channel.inventory_sync.failed'] } },
      },
    });
  });

  it('scopes read-all to currently visible recipients', async () => {
    let updateManyArgs: unknown;
    prisma.notificationRecipient.updateMany.mockImplementation((args) => {
      updateManyArgs = args;
      return Promise.resolve({ count: 3 });
    });

    await expect(service.markAllRead('tenant-1', 'user-1')).resolves.toEqual({ updated: 3 });
    expect(updateManyArgs).toMatchObject({
      where: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        readAt: null,
        notificationEvent: { eventType: { in: ['channel.inventory_sync.failed'] } },
      },
    });
    const call = updateManyArgs as {
      data: { readAt: unknown };
    };
    expect(call.data.readAt).toBeInstanceOf(Date);
  });
});
