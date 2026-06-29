import { AuditLog, Tenant } from '@prisma/client';
import { PlatformAuditLogResponseDto } from '../dto/platform-audit-log-response.dto';

export class PlatformAuditMapper {
  static toResponse(
    auditLog: AuditLog,
    tenant?: Tenant | null,
  ): PlatformAuditLogResponseDto {
    return {
      id: auditLog.id,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          }
        : undefined,
      action: auditLog.action,
      severity: auditLog.severity || undefined,
      actorType: auditLog.actorType || undefined,
      source: auditLog.source || undefined,
      entityType: auditLog.entityType || undefined,
      summary: auditLog.summary || undefined,
      occurredAt: auditLog.createdAt,
    };
  }
}
