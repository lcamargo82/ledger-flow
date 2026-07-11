/* oxlint-disable vitest/require-mock-type-parameters */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { channelsService } from '../services/channels.service'
import { httpClient } from '../services/http-client'

vi.mock('../services/http-client', () => ({
  httpClient: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

describe('ChannelsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts the Mercado Livre OAuth connection through the channels endpoint', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({
      data: { authorizationUrl: 'https://auth.mercadolivre.com.br/authorization' },
    })

    await expect(channelsService.connectMercadoLivre()).resolves.toEqual({
      authorizationUrl: 'https://auth.mercadolivre.com.br/authorization',
    })

    expect(httpClient.post).toHaveBeenCalledWith('/channels/mercado-livre/connect', {})
  })

  it('updates operational integration settings through the tenant-scoped endpoint', async () => {
    vi.mocked(httpClient.patch).mockResolvedValue({
      data: { integration: { id: 'integration-1' } },
    })

    await channelsService.updateIntegrationSettings('integration-1', {
      defaultWarehouseId: 'warehouse-1',
      syncEnabled: true,
    })

    expect(httpClient.patch).toHaveBeenCalledWith('/channels/integrations/integration-1/settings', {
      defaultWarehouseId: 'warehouse-1',
      syncEnabled: true,
    })
  })
})
