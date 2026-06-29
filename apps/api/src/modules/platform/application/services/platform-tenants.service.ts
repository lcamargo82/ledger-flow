import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PlatformTenantsRepository } from '../../domain/repositories/platform-tenants.repository';
import { ListPlatformTenantsQueryDto } from '../dto/list-platform-tenants-query.dto';
import { UpdatePlatformTenantDto } from '../dto/update-platform-tenant.dto';
import { UpdatePlatformTenantStatusDto } from '../dto/update-platform-tenant-status.dto';
import { UpdateTenantSubscriptionDto } from '../dto/update-tenant-subscription.dto';
import { PlatformTenantMapper } from '../mappers/platform-tenant.mapper';
import { PaginatedPlatformTenantsResponseDto } from '../dto/paginated-platform-tenants-response.dto';
import { PlatformTenantDetailsResponseDto } from '../dto/platform-tenant-details-response.dto';
import { PrismaService } from '../../../../database/prisma/prisma.service';

@Injectable()
export class PlatformTenantsService {
  constructor(
    private readonly repository: PlatformTenantsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: ListPlatformTenantsQueryDto): Promise<PaginatedPlatformTenantsResponseDto> {
    const [tenants, total] = await this.repository.findMany(query);
    return {
      data: tenants.map(PlatformTenantMapper.toResponseDto),
      total,
      page: query.page || 1,
      perPage: query.perPage || 10,
    };
  }

  async findOne(id: string, actorUserId: string): Promise<PlatformTenantDetailsResponseDto> {
    const tenant = await this.repository.findById(id);
    if (!tenant || tenant.kind === 'PLATFORM') {
      throw new NotFoundException('Tenant not found.');
    }

    await this.logAudit('platform.tenant.details_viewed', actorUserId, id);

    return PlatformTenantMapper.toDetailsResponseDto(tenant);
  }

  async update(id: string, dto: UpdatePlatformTenantDto, actorUserId: string) {
    const tenant = await this.repository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found.');
    if (tenant.kind === 'PLATFORM') throw new ConflictException('The platform tenant cannot be modified through this endpoint.');

    const updated = await this.repository.update(id, dto);

    await this.logAudit('platform.tenant.updated', actorUserId, id, {
      changedFields: Object.keys(dto),
    });

    return PlatformTenantMapper.toResponseDto(updated);
  }

  async updateStatus(id: string, dto: UpdatePlatformTenantStatusDto, actorUserId: string) {
    const tenant = await this.repository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found.');
    if (tenant.kind === 'PLATFORM') throw new ConflictException('The platform tenant cannot be modified through this endpoint.');

    const updated = await this.repository.update(id, { active: dto.active });

    await this.logAudit(dto.active ? 'platform.tenant.activated' : 'platform.tenant.deactivated', actorUserId, id, {
      previousStatus: tenant.active,
      currentStatus: dto.active,
    });

    if (!dto.active) {
      await this.prisma.userSession.updateMany({
        where: { user: { tenantId: id }, active: true },
        data: { active: false, revokedAt: new Date() },
      });
      await this.prisma.refreshToken.updateMany({
        where: { user: { tenantId: id }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return PlatformTenantMapper.toResponseDto(updated);
  }

  async updateSubscription(id: string, dto: UpdateTenantSubscriptionDto, actorUserId: string) {
    const tenant = await this.repository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found.');
    if (tenant.kind === 'PLATFORM') throw new ConflictException('The platform tenant cannot be modified through this endpoint.');

    if (dto.currentPeriodStart && dto.currentPeriodEnd) {
      if (new Date(dto.currentPeriodEnd) <= new Date(dto.currentPeriodStart)) {
        throw new ConflictException('Subscription period end must be after the start date.');
      }
    }

    const previousPlan = tenant.subscription?.plan;
    const previousStatus = tenant.subscription?.status;

    await this.repository.updateSubscription(id, dto as any);
    const updatedTenant = await this.repository.findById(id);

    await this.logAudit('platform.subscription.updated', actorUserId, id, {
      previousPlan,
      currentPlan: dto.plan,
      previousSubscriptionStatus: previousStatus,
      currentSubscriptionStatus: dto.status,
    });

    return PlatformTenantMapper.toDetailsResponseDto(updatedTenant!);
  }

  private async logAudit(action: string, actorUserId: string, targetTenantId: string, metadata: any = {}) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: 'Tenant',
        entityId: targetTenantId,
        metadata: { ...metadata, targetTenantId },
      },
    });
  }
}
