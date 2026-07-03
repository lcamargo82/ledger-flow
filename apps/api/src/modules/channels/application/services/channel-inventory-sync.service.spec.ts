import { ChannelInventorySyncStatus, ChannelProvider } from '@prisma/client';
import { ChannelInventorySyncService } from './channel-inventory-sync.service';

describe('ChannelInventorySyncService', () => {
  const channelsRepository = {
    findSyncableListingsBySku: jest.fn(),
    upsertInventorySyncState: jest.fn(),
    listInventorySyncStates: jest.fn(),
    findPendingInventorySyncStates: jest.fn(),
    markInventorySyncSuccess: jest.fn(),
    markInventorySyncRetry: jest.fn(),
    markInventorySyncCircuitOpen: jest.fn(),
  };

  const prisma = {
    outboxEvent: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('coalesces rapid balance changes by listing and keeps the latest quantity', async () => {
    channelsRepository.findSyncableListingsBySku.mockResolvedValue([
      {
        id: 'listing-1',
        tenantId: 'tenant-1',
        integrationId: 'integration-1',
        provider: ChannelProvider.MOCK,
        externalListingId: 'mock-listing-1',
        matchedSkuId: 'sku-1',
      },
    ]);
    channelsRepository.upsertInventorySyncState.mockResolvedValue({
      id: 'sync-1',
      listingId: 'listing-1',
      targetAvailableQuantity: '8',
    });
    const service = new ChannelInventorySyncService(channelsRepository as never, prisma as never);

    await service.enqueueBalanceChanged({
      tenantId: 'tenant-1',
      skuId: 'sku-1',
      availableQuantity: 5,
      balanceId: 'balance-1',
    });
    await service.enqueueBalanceChanged({
      tenantId: 'tenant-1',
      skuId: 'sku-1',
      availableQuantity: 8,
      balanceId: 'balance-1',
    });

    expect(channelsRepository.upsertInventorySyncState).toHaveBeenCalledTimes(2);
    expect(channelsRepository.upsertInventorySyncState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        listingId: 'listing-1',
        skuId: 'sku-1',
        targetAvailableQuantity: 8,
      }),
    );
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'channel.inventory_sync.requested',
          aggregateId: 'listing-1',
        }),
      }),
    );
  });

  it('processes pending mock syncs successfully and is replay-safe when quantity is unchanged', async () => {
    channelsRepository.findPendingInventorySyncStates.mockResolvedValue([
      {
        id: 'sync-1',
        tenantId: 'tenant-1',
        provider: ChannelProvider.MOCK,
        externalListingId: 'mock-listing-1',
        targetAvailableQuantity: '8',
        lastSyncedQuantity: '8',
        attemptCount: 0,
      },
    ]);
    channelsRepository.markInventorySyncSuccess.mockResolvedValue({
      id: 'sync-1',
      status: ChannelInventorySyncStatus.SYNCED,
    });
    const service = new ChannelInventorySyncService(channelsRepository as never, prisma as never);

    const result = await service.processPending('tenant-1');

    expect(result).toEqual({ processed: 1, synced: 1, retryScheduled: 0, circuitOpened: 0 });
    expect(channelsRepository.markInventorySyncSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sync-1', quantity: 8 }),
    );
  });

  it('schedules retry with jitter when mock provider returns 429', async () => {
    channelsRepository.findPendingInventorySyncStates.mockResolvedValue([
      {
        id: 'sync-1',
        tenantId: 'tenant-1',
        provider: ChannelProvider.MOCK,
        externalListingId: 'mock-rate-limit-listing',
        targetAvailableQuantity: '8',
        attemptCount: 0,
      },
    ]);
    const service = new ChannelInventorySyncService(channelsRepository as never, prisma as never);

    const result = await service.processPending('tenant-1');

    expect(result.retryScheduled).toBe(1);
    expect(channelsRepository.markInventorySyncRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sync-1',
        errorCode: 'PROVIDER_RATE_LIMIT',
      }),
    );
  });

  it('opens circuit after repeated rate limits to avoid call storms', async () => {
    channelsRepository.findPendingInventorySyncStates.mockResolvedValue([
      {
        id: 'sync-1',
        tenantId: 'tenant-1',
        provider: ChannelProvider.MOCK,
        externalListingId: 'mock-rate-limit-listing',
        targetAvailableQuantity: '8',
        attemptCount: 2,
      },
    ]);
    const service = new ChannelInventorySyncService(channelsRepository as never, prisma as never);

    const result = await service.processPending('tenant-1');

    expect(result.circuitOpened).toBe(1);
    expect(channelsRepository.markInventorySyncCircuitOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sync-1',
        errorCode: 'PROVIDER_RATE_LIMIT',
      }),
    );
  });
});
