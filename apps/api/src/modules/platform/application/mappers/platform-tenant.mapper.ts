import { PlatformTenantResponseDto } from '../dto/platform-tenant-response.dto';
import { PlatformTenantDetailsResponseDto } from '../dto/platform-tenant-details-response.dto';
import { Tenant, TenantSubscription } from '@prisma/client';

export class PlatformTenantMapper {
  static toResponseDto(
    tenant: Tenant & { subscription?: TenantSubscription | null },
  ): PlatformTenantResponseDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      timezone: tenant.timezone,
      active: tenant.active,
      kind: tenant.kind,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      subscription: tenant.subscription
        ? {
            plan: tenant.subscription.plan,
            status: tenant.subscription.status,
          }
        : undefined,
    };
  }

  static toDetailsResponseDto(
    tenant: Tenant & {
      subscription?: TenantSubscription | null;
      _count: { users: number; customers: number; payments: number };
    },
  ): PlatformTenantDetailsResponseDto {
    const response = this.toResponseDto(tenant) as PlatformTenantDetailsResponseDto;

    if (tenant.subscription) {
      response.subscriptionDetails = {
        id: tenant.subscription.id,
        plan: tenant.subscription.plan,
        status: tenant.subscription.status,
        trialEndsAt: tenant.subscription.trialEndsAt || undefined,
        currentPeriodStart: tenant.subscription.currentPeriodStart || undefined,
        currentPeriodEnd: tenant.subscription.currentPeriodEnd || undefined,
        externalSubscriptionReference:
          tenant.subscription.externalSubscriptionReference || undefined,
        notes: tenant.subscription.notes || undefined,
        createdAt: tenant.subscription.createdAt,
        updatedAt: tenant.subscription.updatedAt,
      };
    }

    response.counts = {
      users: tenant._count.users,
      customers: tenant._count.customers,
      payments: tenant._count.payments,
    };

    return response;
  }
}
