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
}
