import { Tenant, TenantSubscription } from '@prisma/client';
import { ListPlatformTenantsQueryDto } from '../../application/dto/list-platform-tenants-query.dto';

export abstract class PlatformTenantsRepository {
  abstract findMany(query: ListPlatformTenantsQueryDto): Promise<[Array<Tenant & { subscription: TenantSubscription | null }>, number]>;
  abstract findById(id: string): Promise<(Tenant & { subscription: TenantSubscription | null; _count: { users: number; customers: number; payments: number } }) | null>;
  abstract update(id: string, data: Partial<Tenant>): Promise<Tenant & { subscription: TenantSubscription | null }>;
  abstract updateSubscription(tenantId: string, data: Partial<TenantSubscription>): Promise<TenantSubscription>;
}
