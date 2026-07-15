import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { channelsService } from '../services/channels.service'
import { useChannelsStore } from '../stores/channels.store'

vi.mock('../services/channels.service', () => ({
  channelsService: {
    mapListing: vi.fn(),
    listListings: vi.fn(),
  },
}))

describe('channels listing mapping errors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps a failed mapping local instead of replacing the Channels page', async () => {
    vi.mocked(channelsService.mapListing).mockRejectedValue(new Error('invalid SKU mapping'))
    const store = useChannelsStore()

    await expect(
      store.mapListing('listing-1', {
        skuId: 'sku-uuid-1',
        reason: 'Vínculo confirmado pelo operador',
      }),
    ).rejects.toThrow('invalid SKU mapping')

    expect(store.error).toBeNull()
    expect(store.isMutating).toBe(false)
  })
})
