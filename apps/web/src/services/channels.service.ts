import { httpClient } from './http-client'
import type {
  ChannelIntegration,
  ChannelIntegrationsResponse,
  ChannelListing,
  ChannelListingsImportResponse,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookStatus,
  CreateChannelIntegrationRequest,
  MapChannelListingRequest,
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
    )
    return data
  }

  async listListings(params?: {
    page?: number
    perPage?: number
    provider?: ChannelProvider
    status?: ChannelListingMatchStatus
  }): Promise<PaginatedChannelListingsResponse> {
    const { data } = await httpClient.get<PaginatedChannelListingsResponse>(
      '/channels/listings/unmatched',
      { params },
    )
    return data
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
}

export const channelsService = new ChannelsService()
