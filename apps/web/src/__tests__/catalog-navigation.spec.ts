import { describe, expect, it } from 'vitest'
import router from '../router'
import ptBR from '../locales/pt-BR.json'
import enUS from '../locales/en-US.json'

describe('catalog navigation', () => {
  it('registers catalog route behind permission and capability metadata', () => {
    const route = router.getRoutes().find(item => item.path === '/catalog/products')

    expect(route?.meta.permissions).toEqual(['catalog:read'])
    expect(route?.meta.capabilities).toEqual(['catalog.manage'])
  })

  it('defines catalog navigation labels for supported locales', () => {
    expect(ptBR.nav.catalog).toBe('Catálogo')
    expect(enUS.nav.catalog).toBe('Catalog')
  })
})
