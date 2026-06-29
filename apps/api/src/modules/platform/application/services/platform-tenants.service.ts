import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PlatformTenantsRepository } from '../../domain/repositories/platform-tenants.repository';
import { ListPlatformTenantsQueryDto } from '../dto/list-platform-tenants-query.dto';
import { UpdatePlatformTenantDto } from '../dto/update-platform-tenant.dto';
import { UpdatePlatformTenantStatusDto } from '../dto/update-platform-tenant-status.dto';
import { UpdateTenantSubscriptionDto } from '../dto/update-tenant-subscription.dto';
import { PlatformTenantMapper } from '../mappers/platform-tenant.mapper';
import { PaginatedPlatformTenantsResponseDto } from '../dto/paginated-platform-tenants-response.dto';
import { PlatformTenantDetailsResponseDto } from '../dto/platform-tenant-details-response.dto';
import { PlatformTenantOverviewResponseDto } from '../dto/platform-tenant-overview-response.dto';
import { PlatformTenantHealthResponseDto, TenantHealthStatus, PlatformTenantHealthReasonDto } from '../dto/platform-tenant-health-response.dto';
import { PlatformTenantActivityResponseDto } from '../dto/platform-tenant-activity-response.dto';
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

  async getTenantOverview(id: string, actorUserId: string): Promise<PlatformTenantOverviewResponseDto> {
    const tenant = await this.repository.findTenantOverviewById(id);
    if (!tenant || tenant.kind === 'PLATFORM') {
      throw new NotFoundException('Tenant not found.');
    }

    await this.logAudit('platform.tenant.overview_requested', actorUserId, id);

    const [users, customers, payments, gateway] = await Promise.all([
      this.repository.countUsersByTenant(id),
      this.repository.countCustomersByTenant(id),
      this.repository.countPaymentsByStatus(id),
      this.repository.findGatewaySummaryByTenant(id),
    ]);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const webhooks = await this.repository.findWebhookSummaryByTenant(id, since24h);

    const [lastPayment, lastPaymentEvent, lastLoginUser] = await Promise.all([
      this.prisma.payment.findFirst({ where: { tenantId: id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.paymentEvent.findFirst({ where: { tenantId: id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.user.findFirst({ where: { tenantId: id, lastLoginAt: { not: null } }, orderBy: { lastLoginAt: 'desc' }, select: { lastLoginAt: true } }),
    ]);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        active: tenant.active,
        timezone: tenant.timezone,
        createdAt: tenant.createdAt.toISOString(),
        subscription: {
          plan: tenant.subscription?.plan || 'FREE',
          status: tenant.subscription?.status || 'TRIAL',
          trialEndsAt: tenant.subscription?.trialEndsAt?.toISOString(),
          currentPeriodEnd: tenant.subscription?.currentPeriodEnd?.toISOString(),
        },
      },
      operations: {
        usersTotal: users.total,
        usersActive: users.active,
        customersTotal: customers.total,
        customersActive: customers.active,
        paymentsTotal: payments['TOTAL'] || 0,
        paymentsPending: payments['PENDING'] || 0,
        paymentsProcessing: payments['PROCESSING'] || 0,
        paymentsApproved: payments['APPROVED'] || 0,
        paymentsFailed: payments['FAILED'] || 0,
        paymentsCanceled: payments['CANCELED'] || 0,
        paymentsRefunded: payments['REFUNDED'] || 0,
      },
      gateway: {
        hasActiveConfiguration: gateway.hasActiveConfiguration,
        activeProviders: gateway.activeProviders.map(p => ({
          provider: p.provider,
          environment: p.environment,
          status: p.status,
          healthStatus: p.healthStatus,
          lastHealthCheckAt: p.lastHealthCheckAt?.toISOString(),
        })),
      },
      webhooks: {
        lastReceivedAt: webhooks.lastReceivedAt?.toISOString(),
        processedLast24Hours: webhooks.processed,
        failedLast24Hours: webhooks.failed,
        ignoredLast24Hours: webhooks.ignored,
      },
      activity: {
        lastPaymentCreatedAt: lastPayment?.createdAt.toISOString(),
        lastPaymentStatusChangeAt: lastPaymentEvent?.createdAt.toISOString(),
        lastUserLoginAt: lastLoginUser?.lastLoginAt?.toISOString(),
      },
    };
  }

  async getTenantHealth(id: string, actorUserId: string): Promise<PlatformTenantHealthResponseDto> {
    const tenant = await this.repository.findTenantOverviewById(id);
    if (!tenant || tenant.kind === 'PLATFORM') {
      throw new NotFoundException('Tenant not found.');
    }

    const [payments, gateway, webhooks] = await Promise.all([
      this.repository.countPaymentsByStatus(id),
      this.repository.findGatewaySummaryByTenant(id),
      this.repository.findWebhookSummaryByTenant(id, new Date(Date.now() - 24 * 60 * 60 * 1000)),
    ]);

    const reasons: PlatformTenantHealthReasonDto[] = [];
    let status = TenantHealthStatus.HEALTHY;

    // Evaluate CRITICAL
    if (!tenant.active) {
      status = TenantHealthStatus.CRITICAL;
      reasons.push({ code: 'TENANT_INACTIVE', message: 'The tenant account is currently deactivated.' });
    }
    if (tenant.subscription?.status === 'SUSPENDED' || tenant.subscription?.status === 'CANCELED') {
      status = TenantHealthStatus.CRITICAL;
      reasons.push({ code: 'SUBSCRIPTION_SUSPENDED', message: 'The subscription is suspended or canceled.' });
    }

    // Evaluate ATTENTION if not critical
    if (status === TenantHealthStatus.HEALTHY) {
      if (tenant.subscription?.status === 'PAST_DUE') {
        status = TenantHealthStatus.ATTENTION;
        reasons.push({ code: 'SUBSCRIPTION_PAST_DUE', message: 'The subscription is past due.' });
      }
      if (webhooks.failed > 0) {
        status = TenantHealthStatus.ATTENTION;
        reasons.push({ code: 'WEBHOOK_FAILURES_RECENT', message: `There are ${webhooks.failed} failed webhook events in the last 24 hours.` });
      }
      const totalPayments = payments['TOTAL'] || 0;
      if (totalPayments > 0 && !gateway.hasActiveConfiguration) {
        status = TenantHealthStatus.ATTENTION;
        reasons.push({ code: 'NO_GATEWAY_CONFIGURATION', message: 'Payments exist but there is no active gateway configuration.' });
      }
    }

    // Evaluate UNKNOWN
    if (status === TenantHealthStatus.HEALTHY && (payments['TOTAL'] || 0) === 0 && !gateway.hasActiveConfiguration) {
      status = TenantHealthStatus.UNKNOWN;
      reasons.push({ code: 'INSUFFICIENT_DATA', message: 'Insufficient operational data to determine health (no payments or gateways).' });
    }

    await this.logAudit('platform.tenant.health_requested', actorUserId, id, { healthStatus: status });

    return {
      tenantId: id,
      status,
      reasons,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async getTenantActivity(id: string, actorUserId: string): Promise<PlatformTenantActivityResponseDto> {
    const tenant = await this.repository.findTenantOverviewById(id);
    if (!tenant || tenant.kind === 'PLATFORM') {
      throw new NotFoundException('Tenant not found.');
    }

    const activity = await this.repository.findRecentActivityByTenant(id, 20);

    return {
      items: activity.map(a => ({
        id: a.id,
        action: a.action,
        label: this.formatActivityLabel(a.action),
        occurredAt: a.createdAt.toISOString(),
        severity: a.action.includes('failed') ? 'ERROR' : a.action.includes('deactivated') ? 'WARNING' : 'INFO',
        actorType: a.actorUserId ? 'USER' : 'SYSTEM',
        metadata: a.metadata,
      })),
    };
  }

  private formatActivityLabel(action: string): string {
    const labels: Record<string, string> = {
      'platform.tenant.created': 'Tenant Created',
      'tenant.activated': 'Tenant Activated',
      'tenant.deactivated': 'Tenant Deactivated',
      'tenant.subscription.updated': 'Subscription Updated',
      'platform.tenant.invitation_sent': 'Invitation Sent',
      'platform.tenant.invitation_resent': 'Invitation Resent',
      'auth.tenant_invitation_accepted': 'Invitation Accepted',
      'gateway.configuration.created': 'Gateway Configured',
      'gateway.configuration.updated': 'Gateway Updated',
      'payment.provider_status_updated': 'Payment Status Sync',
      'webhook.processing_failed': 'Webhook Processing Failed',
    };
    return labels[action] || action;
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
