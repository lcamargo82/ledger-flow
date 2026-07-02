import { Injectable } from '@nestjs/common';
import {
  SubscriptionPlan,
  TenantSubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CommerceCapabilities,
  type CommerceCapability,
} from '../../domain/constants/platform-capabilities';

const erpBasicCapabilities: CommerceCapability[] = [
  CommerceCapabilities.CatalogManage,
  CommerceCapabilities.InventoryManage,
  CommerceCapabilities.InventoryAdjust,
  CommerceCapabilities.OrdersManage,
  CommerceCapabilities.InventoryReportsRead,
];

const commerceCapabilities: CommerceCapability[] = [
  ...erpBasicCapabilities,
  CommerceCapabilities.ChannelsConnect,
  CommerceCapabilities.ChannelsImportListings,
  CommerceCapabilities.ChannelsMappingManage,
  CommerceCapabilities.ChannelsSyncInventory,
  CommerceCapabilities.OrdersChannelIntake,
];

const masterCapabilities: CommerceCapability[] = [
  ...commerceCapabilities,
  CommerceCapabilities.FinancialAnalyticsRead,
];

const capabilitiesByPlan: Record<SubscriptionPlan, CommerceCapability[]> = {
  [SubscriptionPlan.FREE]: [],
  [SubscriptionPlan.STARTER]: [],
  [SubscriptionPlan.PROFESSIONAL]: erpBasicCapabilities,
  [SubscriptionPlan.ENTERPRISE]: masterCapabilities,
  [SubscriptionPlan.CUSTOM]: masterCapabilities,
};

@Injectable()
export class CapabilityPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async hasCapabilities(
    tenantId: string,
    requiredCapabilities: CommerceCapability[],
  ): Promise<boolean> {
    if (requiredCapabilities.length === 0) {
      return true;
    }

    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: {
        plan: true,
        status: true,
      },
    });

    if (!subscription || subscription.status !== TenantSubscriptionStatus.ACTIVE) {
      return false;
    }

    const tenantCapabilities = new Set(capabilitiesByPlan[subscription.plan]);

    return requiredCapabilities.every((capability) =>
      tenantCapabilities.has(capability),
    );
  }

  getCapabilitiesForPlan(plan: SubscriptionPlan): CommerceCapability[] {
    return capabilitiesByPlan[plan];
  }

  async getCapabilitiesForTenant(
    tenantId: string,
  ): Promise<CommerceCapability[]> {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: {
        plan: true,
        status: true,
      },
    });

    if (!subscription || subscription.status !== TenantSubscriptionStatus.ACTIVE) {
      return [];
    }

    return this.getCapabilitiesForPlan(subscription.plan);
  }
}
