export const GATEWAY_PROVIDER = {
  MERCADO_PAGO: 'MERCADO_PAGO',
} as const

export type GatewayProvider = (typeof GATEWAY_PROVIDER)[keyof typeof GATEWAY_PROVIDER]

const PROVIDER_ALIASES: Record<string, GatewayProvider> = {
  MERCADO_PAGO: GATEWAY_PROVIDER.MERCADO_PAGO,
  MERCADO_PAGO_GATEWAY: GATEWAY_PROVIDER.MERCADO_PAGO,
  mercado_pago: GATEWAY_PROVIDER.MERCADO_PAGO,
  'mercado-pago': GATEWAY_PROVIDER.MERCADO_PAGO,
}

export function normalizeGatewayProvider(value: unknown): GatewayProvider | null {
  if (typeof value !== 'string') return null
  return PROVIDER_ALIASES[value] ?? PROVIDER_ALIASES[value.trim()] ?? null
}
