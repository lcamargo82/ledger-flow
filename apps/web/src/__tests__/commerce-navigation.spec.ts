import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '../router'
import { useAuthStore } from '../stores/auth.store'
import ptBR from '../locales/pt-BR.json'
import enUS from '../locales/en-US.json'

describe('commerce navigation foundation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('registers inventory route behind permission and capability metadata', () => {
    const inventoryRoutes = [
      '/inventory',
      '/inventory/warehouses',
      '/inventory/movements',
      '/inventory/reservations',
    ].map((path) => router.getRoutes().find((item) => item.path === path))

    inventoryRoutes.forEach((route) => {
      expect(route?.meta.permissions).toEqual(['inventory:read'])
      expect(route?.meta.capabilities).toEqual(['inventory.manage'])
    })
  })

  it('registers orders route behind permission and capability metadata', () => {
    const ordersRoute = router.getRoutes().find((item) => item.path === '/orders')

    expect(ordersRoute?.meta.permissions).toEqual(['orders:read'])
    expect(ordersRoute?.meta.capabilities).toEqual(['orders.manage'])
  })

  it('registers channels route behind permission and capability metadata', () => {
    const channelsRoute = router.getRoutes().find((item) => item.path === '/channels')

    expect(channelsRoute?.meta.permissions).toEqual(['channels:read'])
    expect(channelsRoute?.meta.capabilities).toEqual(['channels.connect'])
  })

  it('registers analytics route behind permission and capability metadata', () => {
    const analyticsRoute = router.getRoutes().find((item) => item.path === '/analytics')

    expect(analyticsRoute?.meta.permissions).toEqual(['financial-intelligence:read'])
    expect(analyticsRoute?.meta.capabilities).toEqual(['financial.analytics.read'])
  })

  it('registers exports route behind report export permission', () => {
    const exportsRoute = router.getRoutes().find((item) => item.path === '/exports')

    expect(exportsRoute?.meta.permissions).toEqual(['reports:export'])
  })

  it('checks capabilities from the authenticated user session', () => {
    const authStore = useAuthStore()
    authStore.user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      tenantName: 'Tenant',
      tenantKind: 'CUSTOMER',
      name: 'Demo User',
      email: 'demo@example.com',
      isPlatformAdmin: false,
      roles: ['OWNER'],
      permissions: ['inventory:read'],
      capabilities: ['inventory.manage'],
    }

    expect(authStore.checkCapability('inventory.manage')).toBe(true)
    expect(authStore.checkAllCapabilities(['inventory.manage'])).toBe(true)
    expect(authStore.checkCapability('channels.connect')).toBe(false)
  })

  it('defines inventory navigation labels for supported locales', () => {
    expect(ptBR.nav.inventory).toBe('Estoque')
    expect(enUS.nav.inventory).toBe('Inventory')
    expect(ptBR.nav.orders).toBe('Pedidos')
    expect(ptBR.orders.actions.confirm).toBe('Confirmar')
    expect(enUS.orders.status.FULFILLED).toBe('Fulfilled')
    expect(ptBR.nav.channels).toBe('Canais')
    expect(ptBR.channels.tabs.inbox).toBe('Inbox')
    expect(ptBR.channels.tabs.listings).toBe('Malha fina')
    expect(ptBR.channels.tabs.sync).toBe('Sincronização')
    expect(ptBR.channels.listingStatus.AMBIGUOUS).toBe('Ambíguo')
    expect(ptBR.channels.syncStatus.CIRCUIT_OPEN).toBe('Circuito aberto')
    expect(enUS.channels.webhookStatus.INVALID).toBe('Invalid')
    expect(enUS.channels.actions.importListings).toBe('Import listings')
    expect(enUS.channels.actions.processSync).toBe('Process pending')
    expect(ptBR.financialIntelligence.cards.cogs).toBe('CMV')
    expect(enUS.financialIntelligence.table.margin).toBe('Margin')
    expect(ptBR.nav.analytics).toBe('Analytics')
    expect(ptBR.exports.actions.create).toBe('Gerar CSV')
    expect(enUS.exports.status.COMPLETED).toBe('Completed')
  })
})
