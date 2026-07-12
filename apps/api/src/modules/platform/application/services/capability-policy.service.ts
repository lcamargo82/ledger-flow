import { Injectable } from '@nestjs/common';
import { SubscriptionPlan, TenantSubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CommerceCapabilities,
  InventoryAdvancedCapabilities,
  NotificationCapabilities,
  ReconciliationCapabilities,
  type PlatformCapability,
} from '../../domain/constants/platform-capabilities';

const erpBasicCapabilities: PlatformCapability[] = [
  NotificationCapabilities.Read,
  CommerceCapabilities.CatalogManage,
  CommerceCapabilities.InventoryManage,
  CommerceCapabilities.InventoryAdjust,
  CommerceCapabilities.OrdersManage,
  CommerceCapabilities.InventoryReportsRead,
  InventoryAdvancedCapabilities.Transfer,
  InventoryAdvancedCapabilities.CycleCount,
];

const commerceCapabilities: PlatformCapability[] = [
  ...erpBasicCapabilities,
  CommerceCapabilities.ChannelsConnect,
  CommerceCapabilities.ChannelsImportListings,
  CommerceCapabilities.ChannelsMappingManage,
  CommerceCapabilities.ChannelsSyncInventory,
  CommerceCapabilities.OrdersChannelIntake,
];

const reconciliationCapabilities: PlatformCapability[] = [
  ReconciliationCapabilities.Read,
  ReconciliationCapabilities.Manage,
  ReconciliationCapabilities.Export,
  ReconciliationCapabilities.Sync,
];

const masterCapabilities: PlatformCapability[] = [
  ...commerceCapabilities,
  CommerceCapabilities.FinancialAnalyticsRead,
  ...reconciliationCapabilities,
  NotificationCapabilities.Manage,
  InventoryAdvancedCapabilities.Approval,
  InventoryAdvancedCapabilities.AlertsManage,
  InventoryAdvancedCapabilities.AgingRead,
  InventoryAdvancedCapabilities.KitsManage,
];

const capabilitiesByPlan: Record<SubscriptionPlan, PlatformCapability[]> = {
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
    requiredCapabilities: PlatformCapability[],
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

    return requiredCapabilities.every((capability) => tenantCapabilities.has(capability));
  }

  getCapabilitiesForPlan(plan: SubscriptionPlan): PlatformCapability[] {
    return capabilitiesByPlan[plan];
  }

  async getCapabilitiesForTenant(tenantId: string): Promise<PlatformCapability[]> {
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
