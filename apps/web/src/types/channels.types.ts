export type ChannelProvider = 'MOCK' | 'MERCADO_LIVRE'
export type ChannelIntegrationStatus = 'ACTIVE' | 'DISABLED'
export type ChannelWebhookStatus = 'RECEIVED' | 'DUPLICATE' | 'INVALID' | 'DLQ'
export type ChannelListingMatchStatus = 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS' | 'IGNORED'

export interface ChannelIntegration {
  id: string
  tenantId: string
  provider: ChannelProvider
  name: string
  status: ChannelIntegrationStatus
  createdByUserId?: string | null
  createdAt: string
  updatedAt: string
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
  title: string
  externalSku?: string | null
  matchStatus: ChannelListingMatchStatus
  matchedSkuId?: string | null
  candidateSkuIds?: string[] | null
  importedAt: string
  ignoredAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChannelListingsImportSummary {
  imported: number
  matched: number
  unmatched: number
  ambiguous: number
  ignored: number
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

export interface ChannelListingsImportResponse {
  summary: ChannelListingsImportSummary
  data: ChannelListing[]
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
