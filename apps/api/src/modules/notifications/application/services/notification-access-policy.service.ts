import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CapabilityPolicyService } from '../../../platform/application/services/capability-policy.service';
import { getVisibleNotificationEventTypes } from '../../domain/constants/notification-event-registry';

@Injectable()
export class NotificationAccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilityPolicy: CapabilityPolicyService,
  ) {}

  async getVisibleEventTypes(tenantId: string, userId: string) {
    const [user, capabilities] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: userId, tenantId, active: true },
        select: {
          roles: {
            select: {
              role: {
                select: {
                  permissions: { select: { permission: { select: { key: true } } } },
                },
              },
            },
          },
        },
      }),
      this.capabilityPolicy.getCapabilitiesForTenant(tenantId),
    ]);

    if (!user) return [];

    const permissions = [
      ...new Set(
        user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)),
      ),
    ];

    return getVisibleNotificationEventTypes(permissions, capabilities);
  }
}
