import { httpClient } from './http-client'
import type {
  ChannelIntegration,
  ChannelInventorySyncProcessSummary,
  ChannelInventorySyncStatus,
  ChannelIntegrationsResponse,
  ChannelReplayResponse,
  ChannelBulkReplayResponse,
  ChannelSkuOption,
  ChannelListing,
  ChannelListingsImportResponse,
  ChannelListingMatchStatus,
  MercadoLivreConnectResponse,
  ChannelProvider,
  ChannelWebhookStatus,
  CreateChannelIntegrationRequest,
  MapChannelListingRequest,
  UpdateChannelIntegrationSettingsRequest,
  PaginatedChannelInventorySyncResponse,
  PaginatedChannelListingsResponse,
  PaginatedChannelInboxResponse,
} from '../types/channels.types'

export class ChannelsService {
  async listIntegrations(): Promise<ChannelIntegrationsResponse> {
    const { data } = await httpClient.get<ChannelIntegrationsResponse>('/channels/integrations')
    return data
  }

  async createIntegration(
    payload: CreateChannelIntegrationRequest,
  ): Promise<{ integration: ChannelIntegration }> {
    const { data } = await httpClient.post<{ integration: ChannelIntegration }>(
      '/channels/integrations',
      payload,
    )
    return data
  }

  async connectMercadoLivre(): Promise<MercadoLivreConnectResponse> {
    const { data } = await httpClient.post<MercadoLivreConnectResponse>(
      '/channels/mercado-livre/connect',
      {},
    )
    return data
  }

  async updateIntegrationSettings(
    integrationId: string,
    payload: UpdateChannelIntegrationSettingsRequest,
  ): Promise<{ integration: ChannelIntegration }> {
    const { data } = await httpClient.patch<{ integration: ChannelIntegration }>(
      `/channels/integrations/${integrationId}/settings`,
      payload,
    )
    return data
  }

  async suspendIntegration(integrationId: string): Promise<{ integration: ChannelIntegration }> {
    const { data } = await httpClient.post<{ integration: ChannelIntegration }>(
      `/channels/integrations/${integrationId}/suspend`,
      {},
    )
    return data
  }

  async reactivateIntegration(integrationId: string): Promise<{ integration: ChannelIntegration }> {
    const { data } = await httpClient.post<{ integration: ChannelIntegration }>(
      `/channels/integrations/${integrationId}/reactivate`,
      {},
    )
    return data
  }

  async disconnectMercadoLivre(integrationId: string): Promise<void> {
    await httpClient.post(`/channels/mercado-livre/integrations/${integrationId}/disconnect`, {})
  }

  async listInbox(params?: {
    page?: number
    perPage?: number
    provider?: ChannelProvider
    status?: ChannelWebhookStatus
  }): Promise<PaginatedChannelInboxResponse> {
    const { data } = await httpClient.get<PaginatedChannelInboxResponse>(
      '/channels/webhook-inbox',
      { params },
    )
    return data
  }

  async importListings(integrationId: string): Promise<ChannelListingsImportResponse> {
    const { data } = await httpClient.post<ChannelListingsImportResponse>(
      `/channels/integrations/${integrationId}/import-listings`,
      {},
      { timeout: 120_000 },
    )
    return data
  }

  async replayWebhookInbox(inboxEventId: string): Promise<ChannelReplayResponse> {
    const { data } = await httpClient.post<ChannelReplayResponse>(
      `/channels/webhook-inbox/${inboxEventId}/replay`,
      {},
    )
    return data
  }

  async replayFailedWebhooks(limit = 50): Promise<ChannelBulkReplayResponse> {
    const { data } = await httpClient.post<ChannelBulkReplayResponse>(
      '/channels/webhook-inbox/replay-failed',
      { limit },
    )
    return data
  }

  async listListings(params?: {
    page?: number
    perPage?: number
    provider?: ChannelProvider
    status?: ChannelListingMatchStatus
    search?: string
  }): Promise<PaginatedChannelListingsResponse> {
    const { data } = await httpClient.get<PaginatedChannelListingsResponse>(
      '/channels/listings/unmatched',
      { params },
    )
    return data
  }

  async listSkuOptions(params?: { search?: string; limit?: number }): Promise<ChannelSkuOption[]> {
    const { data } = await httpClient.get<{ data: ChannelSkuOption[] }>('/channels/skus/options', {
      params,
    })
    return data.data
  }

  async mapListing(
    listingId: string,
    payload: MapChannelListingRequest,
  ): Promise<{ listing: ChannelListing }> {
    const { data } = await httpClient.post<{ listing: ChannelListing }>(
      `/channels/listings/${listingId}/map`,
      payload,
    )
    return data
  }

  async listInventorySyncStatus(params?: {
    page?: number
    perPage?: number
    provider?: ChannelProvider
    status?: ChannelInventorySyncStatus
  }): Promise<PaginatedChannelInventorySyncResponse> {
    const { data } = await httpClient.get<PaginatedChannelInventorySyncResponse>(
      '/channels/inventory-sync/status',
      { params },
    )
    return data
  }

  async processInventorySync(): Promise<ChannelInventorySyncProcessSummary> {
    const { data } = await httpClient.post<ChannelInventorySyncProcessSummary>(
      '/channels/inventory-sync/process-pending',
      {},
    )
    return data
  }
}

export const channelsService = new ChannelsService()
