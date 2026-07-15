import { ChannelsController } from './channels.controller';

describe('ChannelsController health and replay', () => {
  const channelsService = {
    createIntegration: jest.fn(),
    listIntegrations: jest.fn(),
    listInbox: jest.fn(),
    importListings: jest.fn(),
    listListings: jest.fn(),
    mapListing: jest.fn(),
  };
  const inventorySyncService = {
    listStatus: jest.fn(),
    processPending: jest.fn(),
  };
  const healthReplayService = {
    getHealth: jest.fn(),
    replayWebhookInbox: jest.fn(),
    replayFailedWebhooks: jest.fn(),
    replayInventorySync: jest.fn(),
  };
  const user = { tenantId: 'tenant-1', id: 'user-1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeController() {
    return new ChannelsController(
      channelsService as never,
      inventorySyncService as never,
      healthReplayService as never,
    );
  }

  it('returns sanitized channel health for the current tenant', async () => {
    healthReplayService.getHealth.mockResolvedValue({
      status: 'HEALTHY',
      summary: {
        integrations: 1,
        failedInbox: 0,
        pendingInbox: 0,
        failedInventorySync: 0,
        circuitOpenInventorySync: 0,
        retryScheduledInventorySync: 0,
      },
      integrations: [],
    });

    const result = await makeController().health(user as never);

    expect(healthReplayService.getHealth).toHaveBeenCalledWith('tenant-1');
    expect(result.status).toBe('HEALTHY');
  });

  it('replays webhook inbox using the current tenant and actor', async () => {
    healthReplayService.replayWebhookInbox.mockResolvedValue({
      replayed: true,
      inboxEventId: 'inbox-1',
    });

    const result = await makeController().replayWebhookInbox(user as never, 'inbox-1');

    expect(healthReplayService.replayWebhookInbox).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      'inbox-1',
    );
    expect(result).toEqual({ replayed: true, inboxEventId: 'inbox-1' });
  });

  it('replays inventory sync using the current tenant and actor', async () => {
    healthReplayService.replayInventorySync.mockResolvedValue({
      replayed: true,
      syncStateId: 'sync-1',
    });

    const result = await makeController().replayInventorySync(user as never, 'sync-1');

    expect(healthReplayService.replayInventorySync).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      'sync-1',
    );
    expect(result).toEqual({ replayed: true, syncStateId: 'sync-1' });
  });

  it('replays a bounded failed webhook batch using the current tenant and actor', async () => {
    healthReplayService.replayFailedWebhooks.mockResolvedValue({
      requested: 2,
      replayed: 2,
      skipped: 0,
      results: [],
    });

    const result = await makeController().replayFailedWebhooks(user as never, { limit: 25 });

    expect(healthReplayService.replayFailedWebhooks).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      { limit: 25 },
    );
    expect(result.replayed).toBe(2);
  });
});
