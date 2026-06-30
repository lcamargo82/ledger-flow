import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  PlatformAuditRepository,
  PaginatedPlatformAuditLogs,
} from '../../domain/repositories/platform-audit.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaPlatformAuditRepository implements PlatformAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyPaginated(params: {
    where: Prisma.AuditLogWhereInput;
    page: number;
    perPage: number;
  }): Promise<PaginatedPlatformAuditLogs> {
    const { where, page, perPage } = params;
    const skip = (page - 1) * perPage;

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async countRecentEvents(params: {
    tenantId: string;
    severity?: 'WARNING' | 'CRITICAL';
    actionStartsWith?: string;
    since: Date;
  }): Promise<number> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: params.tenantId,
      createdAt: { gte: params.since },
    };

    if (params.severity) {
      where.severity = params.severity;
    }

    if (params.actionStartsWith) {
      where.action = { startsWith: params.actionStartsWith };
    }

    return this.prisma.auditLog.count({ where });
  }

  async findLatestEventDate(params: {
    tenantId: string;
    actionStartsWith?: string;
    action?: string;
  }): Promise<Date | null> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.action) {
      where.action = params.action;
    } else if (params.actionStartsWith) {
      where.action = { startsWith: params.actionStartsWith };
    }

    const latest = await this.prisma.auditLog.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return latest?.createdAt || null;
  }
}
