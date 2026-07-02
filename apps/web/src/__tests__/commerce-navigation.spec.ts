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
    expect(ptBR.nav.channels).toBe('Canais')
    expect(ptBR.nav.analytics).toBe('Analytics')
  })
})
