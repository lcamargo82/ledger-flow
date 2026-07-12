import { NotificationAudienceResolverService } from './notification-audience-resolver.service';

describe('NotificationAudienceResolverService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
    },
  };
  const capabilityPolicy = {
    hasCapabilities: jest.fn(),
  };

  let service: NotificationAudienceResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationAudienceResolverService(prisma as never, capabilityPolicy as never);
  });

  it('selects only active users from the event tenant with an eligible permission', async () => {
    capabilityPolicy.hasCapabilities.mockResolvedValue(true);
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);

    await expect(
      service.resolve('tenant-1', {
        requiredPermissions: ['channels:read', 'channels:manage'],
        requiredCapabilities: ['notifications.read'],
      }),
    ).resolves.toEqual(['user-1']);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        active: true,
        roles: {
          some: {
            role: {
              permissions: {
                some: {
                  permission: { key: { in: ['channels:read', 'channels:manage'] } },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
  });

  it('returns no recipients when the tenant lacks a required capability', async () => {
    capabilityPolicy.hasCapabilities.mockResolvedValue(false);

    await expect(
      service.resolve('tenant-1', {
        requiredPermissions: ['channels:read'],
        requiredCapabilities: ['notifications.read'],
      }),
    ).resolves.toEqual([]);

    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
