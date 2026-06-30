import { Tenant, TenantSubscription } from '@prisma/client';
import { ListPlatformTenantsQueryDto } from '../../application/dto/list-platform-tenants-query.dto';

export abstract class PlatformTenantsRepository {
  abstract findMany(
    query: ListPlatformTenantsQueryDto,
  ): Promise<[Array<Tenant & { subscription: TenantSubscription | null }>, number]>;
  abstract findById(id: string): Promise<
    | (Tenant & {
        subscription: TenantSubscription | null;
        _count: { users: number; customers: number; payments: number };
      })
    | null
  >;
  abstract update(
    id: string,
    data: Partial<Tenant>,
  ): Promise<Tenant & { subscription: TenantSubscription | null }>;
  abstract updateSubscription(
    tenantId: string,
    data: Partial<TenantSubscription>,
  ): Promise<TenantSubscription>;

  // Aggregation & Health Methods
  abstract findTenantOverviewById(tenantId: string): Promise<any>;
  abstract countUsersByTenant(tenantId: string): Promise<{ total: number; active: number }>;
  abstract countCustomersByTenant(tenantId: string): Promise<{ total: number; active: number }>;
  abstract countPaymentsByStatus(tenantId: string): Promise<Record<string, number>>;
  abstract findGatewaySummaryByTenant(
    tenantId: string,
  ): Promise<{ hasActiveConfiguration: boolean; activeProviders: any[] }>;
  abstract findWebhookSummaryByTenant(
    tenantId: string,
    sinceDate: Date,
  ): Promise<{
    lastReceivedAt: Date | null;
    processed: number;
    failed: number;
    ignored: number;
  }>;
  abstract findRecentActivityByTenant(tenantId: string, limit?: number): Promise<any[]>;
}
