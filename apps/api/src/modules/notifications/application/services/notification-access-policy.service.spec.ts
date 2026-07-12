import { NotificationAccessPolicyService } from './notification-access-policy.service';

describe('NotificationAccessPolicyService', () => {
  const prisma = { user: { findFirst: jest.fn() } };
  const capabilityPolicy = { getCapabilitiesForTenant: jest.fn() };
  let service: NotificationAccessPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationAccessPolicyService(prisma as never, capabilityPolicy as never);
  });

  it('revalidates current database permissions before exposing event types', async () => {
    prisma.user.findFirst.mockResolvedValue({
      roles: [
        {
          role: {
            permissions: [{ permission: { key: 'channels:read' } }],
          },
        },
      ],
    });
    capabilityPolicy.getCapabilitiesForTenant.mockResolvedValue([
      'notifications.read',
      'channels.sync_inventory',
    ]);

    await expect(service.getVisibleEventTypes('tenant-1', 'user-1')).resolves.toEqual([
      'channel.inventory_sync.failed',
    ]);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1', tenantId: 'tenant-1', active: true } }),
    );
  });

  it('returns no visible events after the user is deactivated', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    capabilityPolicy.getCapabilitiesForTenant.mockResolvedValue(['notifications.read']);

    await expect(service.getVisibleEventTypes('tenant-1', 'user-1')).resolves.toEqual([]);
  });
});
