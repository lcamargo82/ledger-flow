export enum TenantKind {
  PLATFORM = 'PLATFORM',
  CUSTOMER = 'CUSTOMER',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export enum TenantSubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  CANCELED = 'CANCELED',
}

export interface TenantSubscriptionShort {
  plan: SubscriptionPlan;
  status: TenantSubscriptionStatus;
}

export interface PlatformTenantResponse {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  active: boolean;
  kind: TenantKind;
  createdAt: string;
  updatedAt: string;
  subscription?: TenantSubscriptionShort;
}

export interface TenantSubscriptionDetails {
  id: string;
  plan: SubscriptionPlan;
  status: TenantSubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  externalSubscriptionReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantCounts {
  users: number;
  customers: number;
  payments: number;
}

export interface PlatformTenantDetailsResponse extends PlatformTenantResponse {
  subscriptionDetails?: TenantSubscriptionDetails;
  counts: TenantCounts;
}

export interface PaginatedPlatformTenantsResponse {
  data: PlatformTenantResponse[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListPlatformTenantsQuery {
  page?: number;
  perPage?: number;
  search?: string;
  active?: boolean;
  subscriptionStatus?: TenantSubscriptionStatus;
  plan?: SubscriptionPlan;
}

export interface UpdatePlatformTenantDto {
  name?: string;
  timezone?: string;
}

export interface UpdatePlatformTenantStatusDto {
  active: boolean;
}

export interface UpdateTenantSubscriptionDto {
  plan?: SubscriptionPlan;
  status?: TenantSubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  notes?: string;
}

export interface PlatformTenantOverviewResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    timezone: string;
    createdAt: string;
    subscription: {
      plan: string;
      status: string;
      trialEndsAt?: string;
      currentPeriodEnd?: string;
    };
  };
  operations: {
    usersTotal: number;
    usersActive: number;
    customersTotal: number;
    customersActive: number;
    paymentsTotal: number;
    paymentsPending: number;
    paymentsProcessing: number;
    paymentsApproved: number;
    paymentsFailed: number;
    paymentsCanceled: number;
    paymentsRefunded: number;
  };
  gateway: {
    hasActiveConfiguration: boolean;
    activeProviders: Array<{
      provider: string;
      environment: string;
      status: string;
      healthStatus: string;
      lastHealthCheckAt?: string;
    }>;
  };
  webhooks: {
    lastReceivedAt?: string;
    processedLast24Hours: number;
    failedLast24Hours: number;
    ignoredLast24Hours: number;
  };
  activity: {
    lastPaymentCreatedAt?: string;
    lastPaymentStatusChangeAt?: string;
    lastUserLoginAt?: string;
  };
}

export enum TenantHealthStatusEnum {
  HEALTHY = 'HEALTHY',
  ATTENTION = 'ATTENTION',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

export interface PlatformTenantHealthResponse {
  tenantId: string;
  status: TenantHealthStatusEnum;
  reasons: Array<{
    code: string;
    message: string;
  }>;
  evaluatedAt: string;
}

export interface PlatformTenantActivityResponse {
  items: Array<{
    id: string;
    action: string;
    label: string;
    occurredAt: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
    actorType?: string;
    metadata?: any;
  }>;
}
