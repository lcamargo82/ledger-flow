import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { TenantResponseDto } from '../dto/tenant-response.dto';
import { UpdateCurrentTenantDto } from '../dto/update-current-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentTenant(tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.active) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
        active: tenant.active,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    };
  }

  async updateCurrentTenant(
    tenantId: string,
    dto: UpdateCurrentTenantDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.active) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        timezone: dto.timezone,
      },
    });

    return {
      tenant: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        timezone: updated.timezone,
        active: updated.active,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  }
}
