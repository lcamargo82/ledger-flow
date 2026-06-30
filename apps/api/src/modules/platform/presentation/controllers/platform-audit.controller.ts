import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/presentation/guards/permission.guard';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { PlatformAdminOnly } from '../../../auth/presentation/decorators/platform-admin-only.decorator';
import { PlatformAuditService } from '../../application/services/platform-audit.service';
import { PlatformSupportService } from '../../application/services/platform-support.service';
import { ListPlatformAuditLogsQueryDto } from '../../application/dto/list-platform-audit-logs-query.dto';
import { PaginatedPlatformAuditLogResponseDto } from '../../application/dto/paginated-platform-audit-log-response.dto';
import { PlatformTenantSupportSummaryDto } from '../../application/dto/platform-tenant-support-summary.dto';

@ApiTags('Platform Administration')
@ApiBearerAuth()
@Controller('platform')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PlatformAuditController {
  constructor(
    private readonly auditService: PlatformAuditService,
    private readonly supportService: PlatformSupportService,
  ) {}

  @Get('audit-logs')
  @PlatformAdminOnly()
  @RequirePermissions('platform:audit:read')
  @ApiOperation({
    summary: 'List platform audit logs',
    description: 'Lists global audit logs. Exclusive to Platform Admin.',
  })
  async listGlobalAuditLogs(
    @Query() query: ListPlatformAuditLogsQueryDto,
  ): Promise<PaginatedPlatformAuditLogResponseDto> {
    return this.auditService.listGlobalAuditLogs(query);
  }

  @Get('tenants/:id/audit-logs')
  @PlatformAdminOnly()
  @RequirePermissions('platform:audit:read')
  @ApiOperation({
    summary: 'List tenant audit logs',
    description: 'Lists audit logs for a specific tenant. Exclusive to Platform Admin.',
  })
  async listTenantAuditLogs(
    @Param('id') tenantId: string,
    @Query() query: ListPlatformAuditLogsQueryDto,
  ): Promise<PaginatedPlatformAuditLogResponseDto> {
    return this.auditService.listTenantAuditLogs(tenantId, query);
  }

  @Get('tenants/:id/support-summary')
  @PlatformAdminOnly()
  @RequirePermissions('platform:support:read')
  @ApiOperation({
    summary: 'Get tenant support summary',
    description: 'Returns a support summary for a specific tenant. Exclusive to Platform Admin.',
  })
  async getTenantSupportSummary(
    @Param('id') tenantId: string,
  ): Promise<PlatformTenantSupportSummaryDto> {
    return this.supportService.getTenantSupportSummary(tenantId);
  }
}
