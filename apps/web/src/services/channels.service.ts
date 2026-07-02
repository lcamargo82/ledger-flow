import { httpClient } from './http-client'
import type {
  ChannelIntegration,
  ChannelIntegrationsResponse,
  ChannelProvider,
  ChannelWebhookStatus,
  CreateChannelIntegrationRequest,
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
}

export const channelsService = new ChannelsService()
