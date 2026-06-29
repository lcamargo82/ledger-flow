import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { PlatformTenantsRepository } from '../../domain/repositories/platform-tenants.repository';
import { ListPlatformTenantsQueryDto } from '../../application/dto/list-platform-tenants-query.dto';
import { Tenant, TenantSubscription } from '@prisma/client';

@Injectable()
export class PrismaPlatformTenantsRepository implements PlatformTenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ListPlatformTenantsQueryDto): Promise<[Array<Tenant & { subscription: TenantSubscription | null }>, number]> {
    const { page = 1, perPage = 10, search, active, subscriptionStatus, plan } = query;
    const skip = (page - 1) * perPage;

    const where: any = {
      kind: 'CUSTOMER',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (active !== undefined) {
      where.active = active;
    }

    if (subscriptionStatus || plan) {
      where.subscription = {};
      if (subscriptionStatus) where.subscription.status = subscriptionStatus;
      if (plan) where.subscription.plan = plan;
    }

    return Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: { subscription: true },
      }),
      this.prisma.tenant.count({ where }),
    ]);
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
        _count: {
          select: { users: true, customers: true, payments: true },
        },
      },
    });
  }

  async update(id: string, data: Partial<Tenant>) {
    return this.prisma.tenant.update({
      where: { id },
      data,
      include: { subscription: true },
    });
  }

  async updateSubscription(tenantId: string, data: Partial<TenantSubscription>) {
    return this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        ...data,
      } as any,
    });
  }

  async findTenantOverviewById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
      },
    });
  }

  async countUsersByTenant(tenantId: string) {
    const [total, active] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId, active: true } }),
    ]);
    return { total, active };
  }

  async countCustomersByTenant(tenantId: string) {
    const [total, active] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, active: true } }),
    ]);
    return { total, active };
  }

  async countPaymentsByStatus(tenantId: string) {
    const groupByStatus = await this.prisma.payment.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });

    const result: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      APPROVED: 0,
      FAILED: 0,
      CANCELED: 0,
      REFUNDED: 0,
    };

    let total = 0;
    for (const group of groupByStatus) {
      result[group.status] = group._count.status;
      total += group._count.status;
    }
    result['TOTAL'] = total;

    return result;
  }

  async findGatewaySummaryByTenant(tenantId: string) {
    const configurations = await this.prisma.gatewayConfiguration.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        provider: true,
        environment: true,
        status: true,
        healthStatus: true,
        lastHealthCheckAt: true,
      },
    });

    return {
      hasActiveConfiguration: configurations.length > 0,
      activeProviders: configurations,
    };
  }

  async findWebhookSummaryByTenant(tenantId: string, sinceDate: Date) {
    const [lastWebhook, processed, failed, ignored] = await Promise.all([
      this.prisma.webhookInboxEvent.findFirst({
        where: { tenantId },
        orderBy: { receivedAt: 'desc' },
        select: { receivedAt: true },
      }),
      this.prisma.webhookInboxEvent.count({
        where: { tenantId, status: 'PROCESSED', receivedAt: { gte: sinceDate } },
      }),
      this.prisma.webhookInboxEvent.count({
        where: { tenantId, status: 'FAILED', receivedAt: { gte: sinceDate } },
      }),
      this.prisma.webhookInboxEvent.count({
        where: { tenantId, status: 'IGNORED', receivedAt: { gte: sinceDate } },
      }),
    ]);

    return {
      lastReceivedAt: lastWebhook?.receivedAt || null,
      processed,
      failed,
      ignored,
    };
  }

  async findRecentActivityByTenant(tenantId: string, limit: number = 10) {
    // Only fetch safe operational logs (avoid sensitive customer/payment data)
    return this.prisma.auditLog.findMany({
      where: { 
        tenantId,
        action: {
          in: [
            'platform.tenant.created',
            'tenant.activated',
            'tenant.deactivated',
            'tenant.subscription.updated',
            'platform.tenant.invitation_sent',
            'platform.tenant.invitation_resent',
            'auth.tenant_invitation_accepted',
            'gateway.configuration.created',
            'gateway.configuration.updated',
            'payment.provider_status_updated',
            'webhook.processing_failed',
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        createdAt: true,
        actorUserId: true,
        metadata: true,
      }
    });
  }
}
