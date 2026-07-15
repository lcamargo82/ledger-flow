import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { inventoryService } from '../services/inventory.service'
import { useInventoryStore } from '../stores/inventory.store'

vi.mock('../services/inventory.service', () => ({
  inventoryService: {
    listBalances: vi.fn<typeof inventoryService.listBalances>(),
  },
}))

describe('inventory pagination', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(inventoryService.listBalances).mockResolvedValue({
      data: [],
      meta: { page: 3, perPage: 10, total: 35, totalPages: 4 },
    })
  })

  it('requests only the selected balance page with the configured page size', async () => {
    const store = useInventoryStore()

    store.setBalancePage(3)
    await flushPromises()

    expect(inventoryService.listBalances).toHaveBeenCalledWith({ page: 3, perPage: 10 })
    expect(store.balanceMeta.page).toBe(3)
    expect(store.balanceMeta.totalPages).toBe(4)
  })
})

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}
