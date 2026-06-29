import { AuditLog, Prisma } from '@prisma/client';

export interface PaginatedPlatformAuditLogs {
  data: AuditLog[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface PlatformAuditRepository {
  findManyPaginated(params: {
    where: Prisma.AuditLogWhereInput;
    page: number;
    perPage: number;
  }): Promise<PaginatedPlatformAuditLogs>;

  countRecentEvents(params: {
    tenantId: string;
    severity?: 'WARNING' | 'CRITICAL';
    actionStartsWith?: string;
    since: Date;
  }): Promise<number>;

  findLatestEventDate(params: {
    tenantId: string;
    actionStartsWith?: string;
    action?: string;
  }): Promise<Date | null>;
}
