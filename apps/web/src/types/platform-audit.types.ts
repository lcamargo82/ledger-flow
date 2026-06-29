export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AuditActorType = 'USER' | 'PLATFORM_ADMIN' | 'SYSTEM' | 'WEBHOOK' | 'WORKER';

export interface PlatformAuditTenantResponse {
  id: string;
  name: string;
  slug: string;
}

export interface PlatformAuditLogResponse {
  id: string;
  tenant?: PlatformAuditTenantResponse;
  action: string;
  severity?: AuditSeverity;
  actorType?: AuditActorType;
  source?: string;
  entityType?: string;
  summary?: string;
  occurredAt: string;
}

export interface PaginatedPlatformAuditLogResponse {
  data: PlatformAuditLogResponse[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface PlatformTenantSupportTenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface PlatformTenantSupportSubscription {
  plan?: string;
  status?: string;
}

export interface PlatformTenantSupportDetails {
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INACTIVE';
  recentWarnings: number;
  recentCriticalEvents: number;
  recentWebhookFailures: number;
  lastSuccessfulWebhookAt?: string;
  lastPaymentStatusChangeAt?: string;
  lastOwnerLoginAt?: string;
  pendingInvitation: boolean;
  activeGatewayProviders: string[];
}

export interface PlatformTenantSupportSummary {
  tenant: PlatformTenantSupportTenant;
  subscription: PlatformTenantSupportSubscription;
  support: PlatformTenantSupportDetails;
  recommendedActions: string[];
}

export interface ListPlatformAuditLogsQuery {
  page?: number;
  perPage?: number;
  tenantId?: string;
  action?: string;
  severity?: AuditSeverity | '';
  actorType?: AuditActorType | '';
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
