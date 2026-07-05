import { beforeEach, describe, expect, it, vi } from 'vitest'
import { channelsService } from '../services/channels.service'
import { httpClient } from '../services/http-client'

vi.mock('../services/http-client', () => ({
  httpClient: {
    post: vi.fn(),
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
})
