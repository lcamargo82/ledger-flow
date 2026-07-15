export type ChannelProvider = 'MOCK' | 'MERCADO_LIVRE'
export type ChannelIntegrationStatus =
  | 'INACTIVE'
  | 'ACTIVE'
  | 'DISABLED'
  | 'SUSPENDED'
  | 'REAUTH_REQUIRED'
export type ChannelWebhookStatus = 'RECEIVED' | 'DUPLICATE' | 'INVALID' | 'DLQ'
export type ChannelListingMatchStatus = 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS' | 'IGNORED'
export type ChannelInventorySyncStatus =
  | 'PENDING'
  | 'SYNCED'
  | 'RETRY_SCHEDULED'
  | 'CIRCUIT_OPEN'
  | 'FAILED'
export type ChannelCircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface ChannelIntegration {
  id: string
  tenantId: string
  provider: ChannelProvider
  name: string
  externalAccountId?: string | null
  displayName?: string | null
  status: ChannelIntegrationStatus
  defaultWarehouseId?: string | null
  settings: {
    syncEnabled: boolean
    stockSyncMode: 'AVAILABLE'
    importListingsOnConnect: boolean
    mercadoLivreWarehouseStoreId?: string | null
    mercadoLivreWarehouseNetworkNodeId?: string | null
  }
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'REAUTH_REQUIRED' | 'SUSPENDED' | 'DISCONNECTED' | 'FAILED'
  requiresReauth: boolean
  lastSuccessfulOperationAt?: string | null
  lastFailureAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateChannelIntegrationSettingsRequest {
  defaultWarehouseId?: string | null
  syncEnabled?: boolean
  stockSyncMode?: 'AVAILABLE'
  importListingsOnConnect?: boolean
  mercadoLivreWarehouseStoreId?: string | null
  mercadoLivreWarehouseNetworkNodeId?: string | null
}

export interface ChannelWebhookInboxEvent {
  id: string
  tenantId: string
  integrationId: string
  provider: ChannelProvider
  providerEventId: string
  eventType: string
  status: ChannelWebhookStatus
  payloadHash: string
  payloadSummary?: Record<string, unknown> | null
  receivedAt: string
  processedAt?: string | null
  failureReason?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChannelInboxMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ChannelListing {
  id: string
  tenantId: string
  integrationId: string
  provider: ChannelProvider
  externalListingId: string
  externalUserProductId?: string | null
  title: string
  externalSku?: string | null
  matchStatus: ChannelListingMatchStatus
  matchedSkuId?: string | null
  candidateSkuIds?: string[] | null
  candidateSkus?: ChannelSkuOption[]
  importedAt: string
  ignoredAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChannelSkuOption {
  id: string
  skuCanonical: string
  skuDisplay: string
  product: { name: string }
}

export interface ChannelListingsImportSummary {
  imported: number
  matched: number
  unmatched: number
  ambiguous: number
  ignored: number
}

export interface ChannelInventorySyncState {
  id: string
  tenantId: string
  listingId: string
  integrationId: string
  provider: ChannelProvider
  externalListingId: string
  skuId: string
  sku?: {
    skuCanonical: string
    skuDisplay: string
    product: { name: string }
  } | null
  status: ChannelInventorySyncStatus
  circuitState: ChannelCircuitState
  targetAvailableQuantity: string
  lastSyncedQuantity?: string | null
  attemptCount: number
  nextAttemptAt?: string | null
  circuitOpenedUntil?: string | null
  lastErrorCode?: string | null
  lastErrorSummary?: string | null
  lastRequestedAt: string
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChannelInventorySyncProcessSummary {
  processed: number
  synced: number
  retryScheduled: number
  circuitOpened: number
}

export interface ChannelIntegrationsResponse {
  data: ChannelIntegration[]
}

export interface PaginatedChannelInboxResponse {
  data: ChannelWebhookInboxEvent[]
  meta: ChannelInboxMeta
}

export interface PaginatedChannelListingsResponse {
  data: ChannelListing[]
  meta: ChannelInboxMeta
}

export interface PaginatedChannelInventorySyncResponse {
  data: ChannelInventorySyncState[]
  meta: ChannelInboxMeta
}

export interface ChannelListingsImportResponse {
  summary: ChannelListingsImportSummary
  data: ChannelListing[]
}

export interface ChannelReplayResponse {
  replayed: boolean
  inboxEventId: string
}

export interface ChannelBulkReplayResponse {
  requested: number
  replayed: number
  skipped: number
  results: Array<{ inboxEventId: string; replayed: boolean; reason?: string }>
}

export interface MercadoLivreConnectResponse {
  authorizationUrl: string
}

export interface CreateChannelIntegrationRequest {
  provider: ChannelProvider
  name: string
  webhookSecret: string
}

export interface MapChannelListingRequest {
  skuId: string
  reason?: string
}
