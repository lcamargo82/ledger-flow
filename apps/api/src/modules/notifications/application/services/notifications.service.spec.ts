import { NotificationCategory, NotificationSeverity, Prisma } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const transaction = {
    notificationEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    notificationRecipient: {
      createMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    notificationEvent: {
      findUniqueOrThrow: jest.fn(),
    },
  };
  const audienceResolver = {
    resolve: jest.fn(),
  };
  const deliveryPlanner = {
    plan: jest.fn(),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as never, audienceResolver as never, deliveryPlanner);
  });

  it('persists one registered event and its authorized recipients', async () => {
    const occurredAt = new Date('2026-07-11T20:00:00.000Z');
    audienceResolver.resolve.mockResolvedValue(['user-1', 'user-2']);
    transaction.notificationEvent.findUnique.mockResolvedValue(null);
    transaction.notificationEvent.create.mockResolvedValue({ id: 'event-1' });

    await expect(
      service.createEvent({
        tenantId: 'tenant-1',
        eventType: 'channel.inventory_sync.failed',
        idempotencyKey: 'sync-1:failed',
        sourceType: 'ChannelInventorySyncState',
        sourceId: 'sync-1',
        occurredAt,
        translationArgs: { listingId: 'listing-1' },
      }),
    ).resolves.toEqual({ event: { id: 'event-1' }, created: true });

    expect(transaction.notificationEvent.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        eventType: 'channel.inventory_sync.failed',
        idempotencyKey: 'sync-1:failed',
        sourceType: 'ChannelInventorySyncState',
        sourceId: 'sync-1',
        occurredAt,
        category: NotificationCategory.CHANNELS,
        severity: NotificationSeverity.ERROR,
        titleKey: 'notifications.events.channelInventorySyncFailed.title',
        messageKey: 'notifications.events.channelInventorySyncFailed.message',
        requiredPermissions: ['channels:read', 'channels:manage'],
        requiredCapabilities: ['notifications.read', 'channels.sync_inventory'],
        translationArgsJson: { listingId: 'listing-1' },
        metadataJson: undefined,
      },
    });
    expect(transaction.notificationRecipient.createMany).toHaveBeenCalledWith({
      data: [
        { tenantId: 'tenant-1', notificationEventId: 'event-1', userId: 'user-1' },
        { tenantId: 'tenant-1', notificationEventId: 'event-1', userId: 'user-2' },
      ],
      skipDuplicates: true,
    });
    expect(deliveryPlanner.plan).toHaveBeenCalledWith(transaction, {
      tenantId: 'tenant-1',
      notificationEventId: 'event-1',
      eventType: 'channel.inventory_sync.failed',
    });
  });

  it('does not create recipients when the idempotency key already exists', async () => {
    const existingEvent = { id: 'event-1' };
    audienceResolver.resolve.mockResolvedValue(['user-1']);
    transaction.notificationEvent.findUnique.mockResolvedValue(existingEvent);

    await expect(
      service.createEvent({
        tenantId: 'tenant-1',
        eventType: 'channel.inventory_sync.failed',
        idempotencyKey: 'sync-1:failed',
        sourceType: 'ChannelInventorySyncState',
        occurredAt: new Date(),
      }),
    ).resolves.toEqual({ event: existingEvent, created: false });

    expect(transaction.notificationEvent.create).not.toHaveBeenCalled();
    expect(transaction.notificationRecipient.createMany).not.toHaveBeenCalled();
    expect(deliveryPlanner.plan).not.toHaveBeenCalled();
  });

  it('keeps settlement ingestion events technical without audience or webhook delivery', async () => {
    audienceResolver.resolve.mockResolvedValue(['user-1']);
    transaction.notificationEvent.findUnique.mockResolvedValue(null);
    transaction.notificationEvent.create.mockResolvedValue({ id: 'event-settlement-1' });

    await expect(
      service.createEvent({
        tenantId: 'tenant-1',
        eventType: 'marketplace_settlement.event_received',
        idempotencyKey: 'marketplace-settlement:settlement-1:received',
        sourceType: 'ProviderSettlementEvent',
        sourceId: 'settlement-1',
        occurredAt: new Date('2026-08-05T21:55:16.000Z'),
        translationArgs: {
          provider: 'MERCADO_PAGO',
          providerPaymentId: '170013289911',
          netAmountMinor: '688',
          currency: 'BRL',
        },
      }),
    ).resolves.toEqual({ event: { id: 'event-settlement-1' }, created: true });

    expect(transaction.notificationEvent.create).toHaveBeenCalled();
    expect(audienceResolver.resolve).not.toHaveBeenCalled();
    expect(transaction.notificationRecipient.createMany).not.toHaveBeenCalled();
    expect(deliveryPlanner.plan).not.toHaveBeenCalled();
  });

  it('returns the winning event when concurrent creation hits the unique constraint', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    prisma.notificationEvent.findUniqueOrThrow.mockResolvedValue({ id: 'event-winner' });

    await expect(
      service.createEvent({
        tenantId: 'tenant-1',
        eventType: 'channel.inventory_sync.failed',
        idempotencyKey: 'sync-1:failed',
        sourceType: 'ChannelInventorySyncState',
        occurredAt: new Date(),
      }),
    ).resolves.toEqual({ event: { id: 'event-winner' }, created: false });
  });
});
