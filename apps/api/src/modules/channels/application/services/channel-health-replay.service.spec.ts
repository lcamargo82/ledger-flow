import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ChannelIntegrationStatus,
  ChannelInventorySyncStatus,
  ChannelProvider,
  ChannelWebhookStatus,
} from '@prisma/client';
import { ChannelHealthReplayService } from './channel-health-replay.service';

describe('ChannelHealthReplayService', () => {
  const channelsRepository = {
    getHealthSummary: jest.fn(),
    findInboxById: jest.fn(),
    resetInboxForReplay: jest.fn(),
    findInventorySyncStateById: jest.fn(),
    resetInventorySyncForReplay: jest.fn(),
  };
  const prisma = {
    outboxEvent: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeService() {
    return new ChannelHealthReplayService(channelsRepository as never, prisma as never);
  }

  it('returns tenant-scoped sanitized channel health', async () => {
    channelsRepository.getHealthSummary.mockResolvedValue({
      integrations: [
        {
          id: 'integration-1',
          provider: ChannelProvider.MERCADO_LIVRE,
          status: ChannelIntegrationStatus.REAUTH_REQUIRED,
          healthStatus: 'degraded',
          lastSuccessfulOperationAt: new Date('2026-07-04T12:00:00.000Z'),
          lastFailureAt: new Date('2026-07-04T13:00:00.000Z'),
          encryptedCredentials: { ciphertext: 'must-not-leak' },
        },
      ],
      failedInboxCount: 2,
      pendingInboxCount: 3,
      failedInventorySyncCount: 4,
      circuitOpenInventorySyncCount: 1,
      retryScheduledInventorySyncCount: 5,
    });

    const result = await makeService().getHealth('tenant-1');

    expect(channelsRepository.getHealthSummary).toHaveBeenCalledWith('tenant-1');
    expect(result).toEqual({
      status: 'DEGRADED',
      summary: {
        integrations: 1,
        failedInbox: 2,
        pendingInbox: 3,
        failedInventorySync: 4,
        circuitOpenInventorySync: 1,
        retryScheduledInventorySync: 5,
      },
      integrations: [
        {
          id: 'integration-1',
          provider: ChannelProvider.MERCADO_LIVRE,
          status: ChannelIntegrationStatus.REAUTH_REQUIRED,
          healthStatus: 'degraded',
          lastSuccessfulOperationAt: new Date('2026-07-04T12:00:00.000Z'),
          lastFailureAt: new Date('2026-07-04T13:00:00.000Z'),
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(JSON.stringify(result)).not.toContain('ciphertext');
  });

  it('replays a failed webhook inbox event by emitting the existing worker event', async () => {
    channelsRepository.findInboxById.mockResolvedValue({
      id: 'inbox-1',
      tenantId: 'tenant-1',
      integrationId: 'integration-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      providerEventId: 'evt-1',
      eventType: 'orders_v2',
      status: ChannelWebhookStatus.RECEIVED,
      processedAt: null,
      failureReason: 'Provider temporary failure',
      payloadHash: 'payload-hash',
    });
    channelsRepository.resetInboxForReplay.mockResolvedValue({ id: 'inbox-1' });

    const result = await makeService().replayWebhookInbox('tenant-1', 'user-1', 'inbox-1');

    expect(channelsRepository.resetInboxForReplay).toHaveBeenCalledWith('inbox-1');
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aggregateType: 'ChannelWebhookInboxEvent',
        aggregateId: 'inbox-1',
        eventType: 'channel.webhook.received',
        payload: {
          inboxEventId: 'inbox-1',
          provider: ChannelProvider.MERCADO_LIVRE,
          providerEventId: 'evt-1',
          status: ChannelWebhookStatus.RECEIVED,
          replay: true,
        },
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'channels.webhook_inbox.replayed',
        entityId: 'inbox-1',
      }),
    });
    expect(result).toEqual({ replayed: true, inboxEventId: 'inbox-1' });
  });

  it('replays inventory sync failures by resetting state and emitting a sync request', async () => {
    channelsRepository.findInventorySyncStateById.mockResolvedValue({
      id: 'sync-1',
      tenantId: 'tenant-1',
      listingId: 'listing-1',
      integrationId: 'integration-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      externalListingId: 'MLB-1',
      skuId: 'sku-1',
      status: ChannelInventorySyncStatus.CIRCUIT_OPEN,
      targetAvailableQuantity: '8',
    });
    channelsRepository.resetInventorySyncForReplay.mockResolvedValue({ id: 'sync-1' });

    const result = await makeService().replayInventorySync('tenant-1', 'user-1', 'sync-1');

    expect(channelsRepository.resetInventorySyncForReplay).toHaveBeenCalledWith('sync-1');
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aggregateType: 'ChannelInventorySyncState',
        aggregateId: 'sync-1',
        eventType: 'channel.inventory_sync.requested',
        payload: {
          syncStateId: 'sync-1',
          listingId: 'listing-1',
          skuId: 'sku-1',
          provider: ChannelProvider.MERCADO_LIVRE,
          targetAvailableQuantity: 8,
          replay: true,
        },
      }),
    });
    expect(result).toEqual({ replayed: true, syncStateId: 'sync-1' });
  });

  it('rejects replay outside the tenant or non-failed states', async () => {
    channelsRepository.findInboxById.mockResolvedValueOnce(null);

    await expect(
      makeService().replayWebhookInbox('tenant-1', 'user-1', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);

    channelsRepository.findInventorySyncStateById.mockResolvedValueOnce({
      id: 'sync-1',
      tenantId: 'tenant-1',
      status: ChannelInventorySyncStatus.SYNCED,
    });

    await expect(
      makeService().replayInventorySync('tenant-1', 'user-1', 'sync-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
