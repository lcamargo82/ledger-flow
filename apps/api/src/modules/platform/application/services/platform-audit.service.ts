import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import type { PlatformAuditRepository } from '../../domain/repositories/platform-audit.repository';
import { PlatformTenantsRepository } from '../../domain/repositories/platform-tenants.repository';
import { ListPlatformAuditLogsQueryDto } from '../dto/list-platform-audit-logs-query.dto';
import { PaginatedPlatformAuditLogResponseDto } from '../dto/paginated-platform-audit-log-response.dto';
import { PlatformAuditMapper } from '../mappers/platform-audit.mapper';
import { Prisma, Tenant } from '@prisma/client';

@Injectable()
export class PlatformAuditService {
  constructor(
    @Inject('PlatformAuditRepository')
    private readonly auditRepo: PlatformAuditRepository,
    private readonly prisma: PrismaService,
    private readonly tenantsRepo: PlatformTenantsRepository,
  ) {}

  async listGlobalAuditLogs(
    query: ListPlatformAuditLogsQueryDto,
  ): Promise<PaginatedPlatformAuditLogResponseDto> {
    const where = await this.buildWhereClause(query);

    const result = await this.auditRepo.findManyPaginated({
      where,
      page: query.page || 1,
      perPage: query.perPage || 20,
    });

    const tenantIds = [...new Set(result.data.map((l) => l.tenantId).filter(Boolean))] as string[];
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
    });
    const tenantMap = new Map<string, Tenant>(tenants.map((t) => [t.id, t]));

    return {
      data: result.data.map((log) =>
        PlatformAuditMapper.toResponse(log, log.tenantId ? tenantMap.get(log.tenantId) : null),
      ),
      meta: result.meta,
    };
  }

  async listTenantAuditLogs(
    tenantId: string,
    query: ListPlatformAuditLogsQueryDto,
  ): Promise<PaginatedPlatformAuditLogResponseDto> {
    const tenant = await this.tenantsRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (tenant.kind === 'PLATFORM') {
      throw new NotFoundException(
        'Cannot list audit logs for PLATFORM tenant directly through this endpoint',
      );
    }

    const tenantQuery = { ...query, tenantId };
    return this.listGlobalAuditLogs(tenantQuery);
  }

  private async buildWhereClause(
    query: ListPlatformAuditLogsQueryDto,
  ): Promise<Prisma.AuditLogWhereInput> {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.action) where.action = query.action;
    if (query.severity) where.severity = query.severity;
    if (query.actorType) where.actorType = query.actorType;
    if (query.source) where.source = query.source;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    if (query.search) {
      // Find matching tenants first for safe join search
      const matchingTenants = await this.prisma.tenant.findMany({
        where: {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      const tenantIds = matchingTenants.map((t) => t.id);

      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
      ];

      if (tenantIds.length > 0) {
        where.OR.push({ tenantId: { in: tenantIds } });
      }
    }

    return where;
  }
}
