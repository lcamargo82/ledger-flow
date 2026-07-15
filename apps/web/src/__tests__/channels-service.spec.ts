/* oxlint-disable vitest/require-mock-type-parameters */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { channelsService } from '../services/channels.service'
import { httpClient } from '../services/http-client'

vi.mock('../services/http-client', () => ({
  httpClient: {
    get: vi.fn(),
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

  it('loads tenant-scoped readable SKU options for listing mapping', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      data: {
        data: [
          {
            id: 'sku-uuid-1',
            skuCanonical: 'CONTROLLER-GAMEPAD',
            skuDisplay: 'CONTROLLER-GAMEPAD',
            product: { name: 'Controle Gamepad Wireless' },
          },
        ],
      },
    })

    await expect(
      channelsService.listSkuOptions({ search: 'gamepad', limit: 50 }),
    ).resolves.toHaveLength(1)

    expect(httpClient.get).toHaveBeenCalledWith('/channels/skus/options', {
      params: { search: 'gamepad', limit: 50 },
    })
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

  it('uses an operation-appropriate timeout for Mercado Livre listing imports', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: { summary: {}, data: [] } })

    await channelsService.importListings('integration-1')

    expect(httpClient.post).toHaveBeenCalledWith(
      '/channels/integrations/integration-1/import-listings',
      {},
      { timeout: 120_000 },
    )
  })

  it('calls tenant-scoped individual and bounded bulk replay endpoints', async () => {
    vi.mocked(httpClient.post)
      .mockResolvedValueOnce({ data: { replayed: true, inboxEventId: 'inbox-1' } })
      .mockResolvedValueOnce({
        data: { requested: 1, replayed: 1, skipped: 0, results: [] },
      })

    await channelsService.replayWebhookInbox('inbox-1')
    await channelsService.replayFailedWebhooks(50)

    expect(httpClient.post).toHaveBeenNthCalledWith(1, '/channels/webhook-inbox/inbox-1/replay', {})
    expect(httpClient.post).toHaveBeenNthCalledWith(2, '/channels/webhook-inbox/replay-failed', {
      limit: 50,
    })
  })
})
