import {
  ChannelIntegrationStatus,
  ChannelInventorySyncStatus,
  ChannelProvider,
} from '@prisma/client';
import { ChannelInventorySyncService } from './channel-inventory-sync.service';

describe('ChannelInventorySyncService', () => {
  const channelsRepository = {
    findSyncableListingsBySku: jest.fn(),
    upsertInventorySyncState: jest.fn(),
    listInventorySyncStates: jest.fn(),
    findPendingInventorySyncStates: jest.fn(),
    findIntegrationById: jest.fn(),
    markInventorySyncSuccess: jest.fn(),
    markInventorySyncRetry: jest.fn(),
    markInventorySyncCircuitOpen: jest.fn(),
  };

  const prisma = {
    outboxEvent: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const mercadoLivreAdapter = {
    updateListingStock: jest.fn(),
  };
  const credentialsEncryptionService = {
    decrypt: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    channelsRepository.findIntegrationById.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MOCK,
      status: ChannelIntegrationStatus.ACTIVE,
      encryptedCredentials: null,
    });
    mercadoLivreAdapter.updateListingStock.mockResolvedValue({
      ok: true,
      providerStatus: 'updated',
      externalListingId: 'MLB-1',
      availableQuantity: 8,
    });
    credentialsEncryptionService.decrypt.mockReturnValue({
      accessToken: 'ml-access-token',
    });
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

  it('updates Mercado Livre listings with desired stock and sanitized credentials', async () => {
    channelsRepository.findPendingInventorySyncStates.mockResolvedValue([
      {
        id: 'sync-ml-1',
        tenantId: 'tenant-1',
        integrationId: 'integration-1',
        provider: ChannelProvider.MERCADO_LIVRE,
        externalListingId: 'MLB-1',
        listingId: 'listing-1',
        skuId: 'sku-1',
        targetAvailableQuantity: '8',
        attemptCount: 0,
      },
    ]);
    channelsRepository.findIntegrationById.mockResolvedValueOnce({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      status: ChannelIntegrationStatus.ACTIVE,
      encryptedCredentials: {
        version: 1,
        algorithm: 'aes-256-gcm',
        ciphertext: 'ciphertext',
      },
    });
    channelsRepository.markInventorySyncSuccess.mockResolvedValue({
      id: 'sync-ml-1',
      status: ChannelInventorySyncStatus.SYNCED,
    });
    const service = new ChannelInventorySyncService(
      channelsRepository as never,
      prisma as never,
      mercadoLivreAdapter as never,
      credentialsEncryptionService as never,
    );

    const result = await service.processPending('tenant-1');

    expect(result.synced).toBe(1);
    expect(credentialsEncryptionService.decrypt).toHaveBeenCalledWith(
      JSON.stringify({
        version: 1,
        algorithm: 'aes-256-gcm',
        ciphertext: 'ciphertext',
      }),
    );
    expect(mercadoLivreAdapter.updateListingStock).toHaveBeenCalledWith({
      accessToken: 'ml-access-token',
      externalListingId: 'MLB-1',
      availableQuantity: 8,
    });
    expect(channelsRepository.markInventorySyncSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sync-ml-1', quantity: 8 }),
    );
    expect(JSON.stringify(prisma.outboxEvent.create.mock.calls)).not.toContain('ml-access-token');
  });

  it('uses Mercado Livre Retry-After when provider returns 429', async () => {
    channelsRepository.findPendingInventorySyncStates.mockResolvedValue([
      {
        id: 'sync-ml-1',
        tenantId: 'tenant-1',
        integrationId: 'integration-1',
        provider: ChannelProvider.MERCADO_LIVRE,
        externalListingId: 'MLB-1',
        targetAvailableQuantity: '8',
        attemptCount: 0,
      },
    ]);
    channelsRepository.findIntegrationById.mockResolvedValueOnce({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      status: ChannelIntegrationStatus.ACTIVE,
      encryptedCredentials: { ciphertext: 'ciphertext' },
    });
    mercadoLivreAdapter.updateListingStock.mockResolvedValueOnce({
      ok: false,
      errorCode: 'PROVIDER_RATE_LIMIT',
      errorSummary: 'Mercado Livre returned 429.',
      retryAfterSeconds: 120,
    });
    const service = new ChannelInventorySyncService(
      channelsRepository as never,
      prisma as never,
      mercadoLivreAdapter as never,
      credentialsEncryptionService as never,
    );

    await service.processPending('tenant-1');

    const nextAttemptAt = channelsRepository.markInventorySyncRetry.mock.calls[0][0].nextAttemptAt;
    expect(channelsRepository.markInventorySyncRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sync-ml-1',
        errorCode: 'PROVIDER_RATE_LIMIT',
        errorSummary: 'Mercado Livre returned 429.',
      }),
    );
    expect(nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 110_000);
  });

  it('does not call Mercado Livre when the integration cannot sync', async () => {
    channelsRepository.findPendingInventorySyncStates.mockResolvedValue([
      {
        id: 'sync-ml-1',
        tenantId: 'tenant-1',
        integrationId: 'integration-1',
        provider: ChannelProvider.MERCADO_LIVRE,
        externalListingId: 'MLB-1',
        targetAvailableQuantity: '8',
        attemptCount: 0,
      },
    ]);
    channelsRepository.findIntegrationById.mockResolvedValueOnce({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      status: ChannelIntegrationStatus.REAUTH_REQUIRED,
      encryptedCredentials: { ciphertext: 'ciphertext' },
    });
    const service = new ChannelInventorySyncService(
      channelsRepository as never,
      prisma as never,
      mercadoLivreAdapter as never,
      credentialsEncryptionService as never,
    );

    const result = await service.processPending('tenant-1');

    expect(result.circuitOpened).toBe(1);
    expect(mercadoLivreAdapter.updateListingStock).not.toHaveBeenCalled();
    expect(channelsRepository.markInventorySyncCircuitOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sync-ml-1',
        errorCode: 'INTEGRATION_NOT_SYNCABLE',
      }),
    );
  });
});
