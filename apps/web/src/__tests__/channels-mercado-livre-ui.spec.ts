/* oxlint-disable vitest/require-mock-type-parameters */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChannelsView from '../views/ChannelsView.vue'
import channelsViewSource from '../views/ChannelsView.vue?raw'

const fetchChannels = vi.fn()
const fetchListings = vi.fn()
const fetchInventorySyncStatus = vi.fn()
const createIntegration = vi.fn()
const connectMercadoLivre = vi.fn()

vi.mock('../stores/auth.store', () => ({
  useAuthStore: () => ({
    checkAllPermissions: vi.fn(() => true),
    checkCapability: vi.fn(() => true),
  }),
}))

vi.mock('../stores/toast.store', () => ({
  useToastStore: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('../stores/confirm-dialog.store', () => ({
  useConfirmDialogStore: () => ({ open: vi.fn() }),
}))

vi.mock('../services/inventory.service', () => ({
  inventoryService: { listWarehouses: vi.fn().mockResolvedValue({ data: [], meta: {} }) },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('../stores/channels.store', () => ({
  useChannelsStore: () => ({
    integrations: [],
    inboxEvents: [],
    listings: [],
    inventorySyncStates: [],
    filters: { page: 1, perPage: 10 },
    listingFilters: { page: 1, perPage: 10, status: 'UNMATCHED' },
    inventorySyncFilters: { page: 1, perPage: 10 },
    lastImportSummary: null,
    lastSyncSummary: null,
    isLoading: false,
    isMutating: false,
    error: null,
    fetchChannels,
    fetchListings,
    fetchInventorySyncStatus,
    createIntegration,
    connectMercadoLivre,
    updateIntegrationSettings: vi.fn(),
    suspendIntegration: vi.fn(),
    reactivateIntegration: vi.fn(),
    disconnectMercadoLivre: vi.fn(),
    importListings: vi.fn(),
    replayWebhookInbox: vi.fn(),
    replayFailedWebhooks: vi.fn(),
    mapListing: vi.fn(),
    processInventorySync: vi.fn(),
    setInboxStatus: vi.fn(),
    setListingStatus: vi.fn(),
    setInventorySyncStatus: vi.fn(),
  }),
}))

describe('ChannelsView Mercado Livre connection', () => {
  afterEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('offers Mercado Livre as an OAuth connection instead of manual webhook credentials', async () => {
    fetchChannels.mockResolvedValue(undefined)
    fetchListings.mockResolvedValue(undefined)
    fetchInventorySyncStatus.mockResolvedValue(undefined)
    connectMercadoLivre.mockResolvedValue('https://auth.mercadolivre.com.br/authorization')

    const wrapper = mount(ChannelsView, { attachTo: document.body })

    await wrapper.get('button').trigger('click')

    const providerSelect = document.body.querySelector<HTMLSelectElement>('#channel-provider')
    expect(providerSelect).not.toBeNull()
    expect([...providerSelect!.options].map((option) => option.value)).toContain('MERCADO_LIVRE')

    providerSelect!.value = 'MERCADO_LIVRE'
    providerSelect!.dispatchEvent(new Event('change'))
    await nextTick()

    expect(document.body.textContent).toContain('Conectar Mercado Livre')
    expect(document.body.textContent).toContain('OAuth')
    expect(document.body.textContent).not.toContain('Segredo do webhook')

    document.body
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await nextTick()

    expect(connectMercadoLivre).toHaveBeenCalledOnce()
    expect(createIntegration).not.toHaveBeenCalled()
  })

  it('renders readable product and SKU fields instead of the internal SKU UUID', () => {
    expect(channelsViewSource).toContain("{ key: 'sku', label")
    expect(channelsViewSource).toContain('item.sku.product.name')
    expect(channelsViewSource).toContain('item.sku.skuDisplay')
    expect(channelsViewSource).not.toContain('#skuId')
  })

  it('maps a listing through a readable product and SKU selector', () => {
    expect(channelsViewSource).toContain('channelsService.listSkuOptions')
    expect(channelsViewSource).toContain('listing.candidateSkus || []')
    expect(channelsViewSource).toContain('sku.product.name')
    expect(channelsViewSource).toContain('sku.skuDisplay')
    expect(channelsViewSource).toContain('id="channel-mapping-sku"')
    expect(channelsViewSource).not.toContain(':label="t(\'channels.form.skuIdLabel\')"')
  })
})
