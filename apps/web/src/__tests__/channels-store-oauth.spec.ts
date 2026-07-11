import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { channelsService } from '../services/channels.service'
import { useChannelsStore } from '../stores/channels.store'

vi.mock('../services/channels.service', () => ({
  channelsService: {
    connectMercadoLivre: vi.fn<() => Promise<{ authorizationUrl: string }>>(),
  },
}))

describe('channels store OAuth navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('opens Mercado Livre authorization in a separate isolated tab', async () => {
    vi.mocked(channelsService.connectMercadoLivre).mockResolvedValue({
      authorizationUrl: 'https://auth.mercadolivre.com.br/authorization',
    })
    const replace = vi.fn<(url: string) => void>()
    const open = vi.spyOn(window, 'open').mockReturnValue({
      location: { replace },
      close: vi.fn<() => void>(),
    } as unknown as Window)

    await useChannelsStore().connectMercadoLivre()

    expect(open).toHaveBeenCalledWith('about:blank', '_blank', 'noopener,noreferrer')
    expect(replace).toHaveBeenCalledWith('https://auth.mercadolivre.com.br/authorization')
  })
})
