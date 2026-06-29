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

export interface CreatePlatformTenantDto {
  organization: {
    name: string;
    slug: string;
    timezone: string;
  };
  owner: {
    name: string;
    email: string;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: TenantSubscriptionStatus;
    trialEndsAt?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    notes?: string;
  };
}

export interface PlatformTenantProvisionResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    kind: string;
    timezone: string;
    subscription: {
      plan: string;
      status: string;
    };
    owner: {
      id: string;
      name: string;
      email: string;
      invitationStatus: string;
      invitationExpiresAt: string;
    };
  };
}
