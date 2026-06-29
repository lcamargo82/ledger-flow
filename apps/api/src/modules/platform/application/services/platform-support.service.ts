import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { PlatformAuditRepository } from '../../domain/repositories/platform-audit.repository';
import { PlatformTenantsRepository } from '../../domain/repositories/platform-tenants.repository';
import { PlatformTenantSupportSummaryDto } from '../dto/platform-tenant-support-summary.dto';
import { AuditActions } from '../../../audit/domain/constants/audit-actions';

@Injectable()
export class PlatformSupportService {
  constructor(
    @Inject('PlatformAuditRepository')
    private readonly auditRepo: PlatformAuditRepository,
    private readonly tenantsRepo: PlatformTenantsRepository,
  ) {}

  async getTenantSupportSummary(tenantId: string): Promise<PlatformTenantSupportSummaryDto> {
    const tenant = await this.tenantsRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (tenant.kind === 'PLATFORM') {
      throw new NotFoundException('Cannot get support summary for PLATFORM tenant');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentWarnings, recentCriticalEvents, recentWebhookFailures, lastSuccessfulWebhookAt, lastPaymentStatusChangeAt, lastOwnerLoginAt] = await Promise.all([
      this.auditRepo.countRecentEvents({ tenantId, severity: 'WARNING', since: thirtyDaysAgo }),
      this.auditRepo.countRecentEvents({ tenantId, severity: 'CRITICAL', since: thirtyDaysAgo }),
      this.auditRepo.countRecentEvents({ tenantId, actionStartsWith: 'webhook.failed', since: thirtyDaysAgo }),
      this.auditRepo.findLatestEventDate({ tenantId, action: AuditActions.WEBHOOK_PROCESSED }),
      this.auditRepo.findLatestEventDate({ tenantId, actionStartsWith: 'payment.provider_' }),
      this.auditRepo.findLatestEventDate({ tenantId, action: AuditActions.AUTH_LOGIN_SUCCEEDED }),
    ]);

    let healthStatus = 'HEALTHY';
    if (recentCriticalEvents > 0 || recentWebhookFailures > 5) healthStatus = 'CRITICAL';
    else if (recentWarnings > 5 || recentWebhookFailures > 0) healthStatus = 'WARNING';
    else if (!tenant.active) healthStatus = 'INACTIVE';

    const recommendedActions: string[] = [];
    if (recentWebhookFailures > 0) recommendedActions.push('REVIEW_WEBHOOK_FAILURES');
    if (tenant.subscription?.status === 'PAST_DUE') recommendedActions.push('REVIEW_SUBSCRIPTION_STATUS');
    if (!tenant.active) recommendedActions.push('REACTIVATE_TENANT');
    
    // We mock these for the foundation
    const pendingInvitation = false;
    const activeGatewayProviders: string[] = [];

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        active: tenant.active,
      },
      subscription: {
        plan: tenant.subscription?.plan,
        status: tenant.subscription?.status,
      },
      support: {
        healthStatus,
        recentWarnings,
        recentCriticalEvents,
        recentWebhookFailures,
        lastSuccessfulWebhookAt: lastSuccessfulWebhookAt || undefined,
        lastPaymentStatusChangeAt: lastPaymentStatusChangeAt || undefined,
        lastOwnerLoginAt: lastOwnerLoginAt || undefined,
        pendingInvitation,
        activeGatewayProviders,
      },
      recommendedActions,
    };
  }
}
