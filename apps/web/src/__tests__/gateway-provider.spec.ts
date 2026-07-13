import { describe, expect, it } from 'vitest'
import { GATEWAY_PROVIDER, normalizeGatewayProvider } from '../utils/gateway-provider'
import ptBR from '../locales/pt-BR.json'
import enUS from '../locales/en-US.json'

describe('gateway provider normalization', () => {
  it('normalizes Mercado Pago callback provider aliases', () => {
    expect(normalizeGatewayProvider('mercado-pago')).toBe(GATEWAY_PROVIDER.MERCADO_PAGO)
    expect(normalizeGatewayProvider('mercado_pago')).toBe(GATEWAY_PROVIDER.MERCADO_PAGO)
    expect(normalizeGatewayProvider('MERCADO_PAGO')).toBe(GATEWAY_PROVIDER.MERCADO_PAGO)
  })

  it('keeps unknown provider values closed', () => {
    expect(normalizeGatewayProvider('asaas')).toBeNull()
    expect(normalizeGatewayProvider(undefined)).toBeNull()
  })

  it('defines Mercado Pago OAuth-only copy in supported locales', () => {
    expect(ptBR.gateways.mercadoPago.oauthOnly).toContain('OAuth')
    expect(enUS.gateways.mercadoPago.oauthOnly).toContain('OAuth')
  })
})
