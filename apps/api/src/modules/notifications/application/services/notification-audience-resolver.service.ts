import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CapabilityPolicyService } from '../../../platform/application/services/capability-policy.service';
import type { PlatformCapability } from '../../../platform/domain/constants/platform-capabilities';

interface NotificationAudienceRequirements {
  requiredPermissions: string[];
  requiredCapabilities: PlatformCapability[];
}

@Injectable()
export class NotificationAudienceResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilityPolicy: CapabilityPolicyService,
  ) {}

  async resolve(
    tenantId: string,
    requirements: NotificationAudienceRequirements,
  ): Promise<string[]> {
    const hasCapabilities = await this.capabilityPolicy.hasCapabilities(
      tenantId,
      requirements.requiredCapabilities,
    );

    if (!hasCapabilities) return [];

    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        active: true,
        ...(requirements.requiredPermissions.length > 0 && {
          roles: {
            some: {
              role: {
                permissions: {
                  some: {
                    permission: { key: { in: requirements.requiredPermissions } },
                  },
                },
              },
            },
          },
        }),
      },
      select: { id: true },
    });

    return users.map(({ id }) => id);
  }
}
