export type ChannelProvider = 'MOCK' | 'MERCADO_LIVRE'
export type ChannelIntegrationStatus = 'ACTIVE' | 'DISABLED'
export type ChannelWebhookStatus = 'RECEIVED' | 'DUPLICATE' | 'INVALID' | 'DLQ'

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

export interface ChannelIntegrationsResponse {
  data: ChannelIntegration[]
}

export interface PaginatedChannelInboxResponse {
  data: ChannelWebhookInboxEvent[]
  meta: ChannelInboxMeta
}

export interface CreateChannelIntegrationRequest {
  provider: ChannelProvider
  name: string
  webhookSecret: string
}
