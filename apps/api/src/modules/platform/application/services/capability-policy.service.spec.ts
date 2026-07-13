import { SubscriptionPlan, TenantSubscriptionStatus } from '@prisma/client';
import { CapabilityPolicyService } from './capability-policy.service';
import {
  CommerceCapabilities,
  ReconciliationCapabilities,
  InventoryAdvancedCapabilities,
} from '../../domain/constants/platform-capabilities';

describe('CapabilityPolicyService', () => {
  const prisma = {
    tenantSubscription: {
      findUnique: jest.fn(),
    },
  };

  let service: CapabilityPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CapabilityPolicyService(prisma as never);
  });

  it('allows ERP Basic capabilities for active PROFESSIONAL tenants', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      plan: SubscriptionPlan.PROFESSIONAL,
      status: TenantSubscriptionStatus.ACTIVE,
    });

    await expect(
      service.hasCapabilities('tenant-1', [CommerceCapabilities.InventoryManage]),
    ).resolves.toBe(true);
  });

  it('denies commerce capabilities for STARTER tenants', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      plan: SubscriptionPlan.STARTER,
      status: TenantSubscriptionStatus.ACTIVE,
    });

    await expect(
      service.hasCapabilities('tenant-1', [CommerceCapabilities.InventoryManage]),
    ).resolves.toBe(false);
  });

  it('allows marketplace settlement capabilities for PROFESSIONAL tenants', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      plan: SubscriptionPlan.PROFESSIONAL,
      status: TenantSubscriptionStatus.ACTIVE,
    });

    await expect(
      service.hasCapabilities('tenant-1', [
        ReconciliationCapabilities.MarketplaceSettlementRead,
        ReconciliationCapabilities.MarketplaceSettlementManage,
      ]),
    ).resolves.toBe(true);
  });

  it('keeps full reconciliation capabilities reserved for ENTERPRISE/CUSTOM tenants', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      plan: SubscriptionPlan.PROFESSIONAL,
      status: TenantSubscriptionStatus.ACTIVE,
    });

    await expect(
      service.hasCapabilities('tenant-1', [ReconciliationCapabilities.Read]),
    ).resolves.toBe(false);
  });

  it('allows transfer and cycle count capabilities for PROFESSIONAL tenants', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      plan: SubscriptionPlan.PROFESSIONAL,
      status: TenantSubscriptionStatus.ACTIVE,
    });

    await expect(
      service.hasCapabilities('tenant-1', [
        InventoryAdvancedCapabilities.Transfer,
        InventoryAdvancedCapabilities.CycleCount,
      ]),
    ).resolves.toBe(true);
  });

  it('reserves inventory approval for ENTERPRISE and CUSTOM tenants', () => {
    expect(service.getCapabilitiesForPlan(SubscriptionPlan.PROFESSIONAL)).not.toContain(
      InventoryAdvancedCapabilities.Approval,
    );
    expect(service.getCapabilitiesForPlan(SubscriptionPlan.ENTERPRISE)).toContain(
      InventoryAdvancedCapabilities.Approval,
    );
  });

  it('denies capabilities for inactive subscriptions', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      plan: SubscriptionPlan.ENTERPRISE,
      status: TenantSubscriptionStatus.SUSPENDED,
    });

    await expect(
      service.hasCapabilities('tenant-1', [CommerceCapabilities.ChannelsConnect]),
    ).resolves.toBe(false);
  });

  it('denies capabilities when the tenant has no subscription', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue(null);

    await expect(
      service.hasCapabilities('tenant-1', [CommerceCapabilities.CatalogManage]),
    ).resolves.toBe(false);
  });

  it('lists active tenant capabilities for session payloads', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      plan: SubscriptionPlan.ENTERPRISE,
      status: TenantSubscriptionStatus.ACTIVE,
    });

    await expect(service.getCapabilitiesForTenant('tenant-1')).resolves.toEqual(
      expect.arrayContaining([
        CommerceCapabilities.InventoryManage,
        CommerceCapabilities.ChannelsConnect,
        CommerceCapabilities.FinancialAnalyticsRead,
        ReconciliationCapabilities.Read,
      ]),
    );
  });
});
