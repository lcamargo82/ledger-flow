import {
  ChannelIntegration,
  ChannelInventorySyncState,
  ChannelInventorySyncStatus,
  ChannelIntegrationStatus,
  ChannelListing,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookInboxEvent,
  ChannelWebhookStatus,
  ProductSku,
  Prisma,
} from '@prisma/client';

export interface CreateChannelIntegrationData {
  tenantId: string;
  provider: ChannelProvider;
  name: string;
  externalAccountId?: string | null;
  displayName?: string | null;
  status?: ChannelIntegrationStatus;
  webhookSecretHash?: string | null;
  settingsJson?: Prisma.InputJsonValue;
  defaultWarehouseId?: string | null;
  syncPolicyJson?: Prisma.InputJsonValue;
  createdByUserId: string;
}

export interface CreateChannelWebhookInboxData {
  tenantId: string;
  integrationId: string;
  provider: ChannelProvider;
  providerEventId: string;
  eventType: string;
  status: ChannelWebhookStatus;
  payloadHash: string;
  payloadSummary?: Prisma.InputJsonValue;
  failureReason?: string | null;
}

export interface ListChannelInboxParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  provider?: ChannelProvider;
  status?: ChannelWebhookStatus;
}

export interface PaginatedChannelInboxResult {
  data: ChannelWebhookInboxEvent[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface MockChannelListingInput {
  externalListingId: string;
  title: string;
  externalSku?: string | null;
}

export interface UpsertChannelListingData extends MockChannelListingInput {
  tenantId: string;
  integrationId: string;
  provider: ChannelProvider;
  matchStatus: ChannelListingMatchStatus;
  matchedSkuId?: string | null;
  candidateSkuIds?: Prisma.InputJsonValue;
}

export interface ListChannelListingsParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  provider?: ChannelProvider;
  status?: ChannelListingMatchStatus;
}

export interface PaginatedChannelListingsResult {
  data: ChannelListing[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface SyncableListingProjection {
  id: string;
  tenantId: string;
  integrationId: string;
  provider: ChannelProvider;
  externalListingId: string;
  matchedSkuId: string | null;
}

export interface UpsertInventorySyncStateData {
  tenantId: string;
  listingId: string;
  integrationId: string;
  provider: ChannelProvider;
  externalListingId: string;
  skuId: string;
  targetAvailableQuantity: number;
}

export interface ListInventorySyncStatesParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  provider?: ChannelProvider;
  status?: ChannelInventorySyncStatus;
}

export interface PaginatedInventorySyncStatesResult {
  data: ChannelInventorySyncState[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export const CHANNELS_REPOSITORY = Symbol('CHANNELS_REPOSITORY');

export interface ChannelsRepository {
  createIntegration(data: CreateChannelIntegrationData): Promise<ChannelIntegration>;
  listIntegrations(tenantId: string): Promise<ChannelIntegration[]>;
  updateIntegrationStatus(
    id: string,
    tenantId: string,
    status: ChannelIntegrationStatus,
  ): Promise<ChannelIntegration>;
  findActiveIntegrationBySecretHash(
    provider: ChannelProvider,
    secretHash: string,
  ): Promise<ChannelIntegration | null>;
  findActiveIntegrationByExternalAccountId(
    provider: ChannelProvider,
    externalAccountId: string,
  ): Promise<ChannelIntegration | null>;
  findIntegrationById(id: string, tenantId: string): Promise<ChannelIntegration | null>;
  findInboxByProviderEventId(
    provider: ChannelProvider,
    providerEventId: string,
  ): Promise<ChannelWebhookInboxEvent | null>;
  createInboxEvent(data: CreateChannelWebhookInboxData): Promise<ChannelWebhookInboxEvent>;
  listInbox(params: ListChannelInboxParams): Promise<PaginatedChannelInboxResult>;
  findSkuMatchCandidates(tenantId: string, externalSku: string): Promise<ProductSku[]>;
  upsertListing(data: UpsertChannelListingData): Promise<ChannelListing>;
  listListings(params: ListChannelListingsParams): Promise<PaginatedChannelListingsResult>;
  findListingById(id: string, tenantId: string): Promise<ChannelListing | null>;
  findSkuById(id: string, tenantId: string): Promise<ProductSku | null>;
  createManualMapping(params: {
    tenantId: string;
    listingId: string;
    skuId: string;
    actorUserId: string;
    reason?: string | null;
  }): Promise<ChannelListing>;
  findSyncableListingsBySku(tenantId: string, skuId: string): Promise<SyncableListingProjection[]>;
  upsertInventorySyncState(
    data: UpsertInventorySyncStateData,
  ): Promise<ChannelInventorySyncState>;
  listInventorySyncStates(
    params: ListInventorySyncStatesParams,
  ): Promise<PaginatedInventorySyncStatesResult>;
  findPendingInventorySyncStates(params: {
    tenantId: string;
    limit: number;
    now: Date;
  }): Promise<ChannelInventorySyncState[]>;
  markInventorySyncSuccess(params: {
    id: string;
    quantity: number;
    now: Date;
  }): Promise<ChannelInventorySyncState>;
  markInventorySyncRetry(params: {
    id: string;
    nextAttemptAt: Date;
    errorCode: string;
    errorSummary: string;
  }): Promise<ChannelInventorySyncState>;
  markInventorySyncCircuitOpen(params: {
    id: string;
    circuitOpenedUntil: Date;
    errorCode: string;
    errorSummary: string;
  }): Promise<ChannelInventorySyncState>;
}
