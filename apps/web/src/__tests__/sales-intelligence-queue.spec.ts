import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { salesIntelligenceService } from '../services/sales-intelligence.service'
import SalesIntelligenceView from '../views/SalesIntelligenceView.vue'

vi.mock('../services/sales-intelligence.service', () => ({
  salesIntelligenceService: {
    list: vi.fn<typeof salesIntelligenceService.list>(),
    getSummary: vi.fn<typeof salesIntelligenceService.getSummary>(),
  },
}))

const row = {
  orderId: 'order-1',
  orderNumber: 'ML-123456',
  externalOrderId: '2000000001',
  soldAt: '2026-07-14T13:00:00.000Z',
  orderStatus: 'CONFIRMED',
  items: [
    {
      orderItemId: 'item-1',
      skuId: 'sku-1',
      sku: 'CAM-001-P',
      productName: 'Camiseta LedgerFlow',
      quantity: '2',
      stockStatus: 'CONSUMED' as const,
    },
  ],
  paymentStatus: 'approved',
  paidAmountMinor: '15000',
  feeAmountMinor: '2140',
  netAmountMinor: '12860',
  netAmountSource: 'REALIZED' as const,
  stockStatus: 'CONSUMED' as const,
  currency: 'BRL',
}

describe('sales intelligence queue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(salesIntelligenceService.list).mockResolvedValue({
      data: [row],
      meta: { page: 1, perPage: 20, total: 21, totalPages: 2 },
    })
    vi.mocked(salesIntelligenceService.getSummary).mockResolvedValue({
      orderCount: 21,
      paidAmountMinor: '15000',
      feeAmountMinor: '2140',
      netAmountMinor: '12860',
      realizedNetAmountMinor: '12860',
      reconciledNetAmountMinor: '0',
      estimatedNetAmountMinor: '0',
      stockIssueCount: 0,
      currency: 'BRL',
    })
  })

  it('renders order summary, explicit net provenance and stock state', async () => {
    const wrapper = mount(SalesIntelligenceView, {
      attachTo: document.body,
      global: { stubs: { Teleport: true } },
    })
    await flushPromises()

    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('21 pedidos')
    expect(text).toContain('ML-123456')
    expect(text).toContain('R$ 150,00')
    expect(text).toContain('R$ 21,40')
    expect(text).toContain('R$ 128,60')
    expect(text).toContain('Líquido realizado')
    expect(text).toContain('Estoque baixado')
  })

  it('opens the item drawer with grouped SKU details', async () => {
    const wrapper = mount(SalesIntelligenceView, {
      attachTo: document.body,
      global: { stubs: { Teleport: true } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="sales-order-details-order-1"]').trigger('click')

    expect(wrapper.get('[data-testid="sales-order-drawer"]').attributes('role')).toBe('dialog')
    expect(wrapper.text()).toContain('CAM-001-P')
    expect(wrapper.text()).toContain('Camiseta LedgerFlow')
    expect(wrapper.text()).toContain('Quantidade: 2')
  })

  it('applies approved filters and changes backend pages', async () => {
    const wrapper = mount(SalesIntelligenceView)
    await flushPromises()

    await wrapper.get('[data-testid="sales-payment-filter"]').setValue('approved')
    await flushPromises()

    expect(salesIntelligenceService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ paymentStatus: 'approved', page: 1 }),
    )
    expect(salesIntelligenceService.getSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ paymentStatus: 'approved' }),
    )

    await wrapper.get('[data-testid="pagination-next"]').trigger('click')
    await flushPromises()

    expect(salesIntelligenceService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ paymentStatus: 'approved', page: 2 }),
    )
  })

  it('shows a loading state while the sales queue is pending', async () => {
    vi.mocked(salesIntelligenceService.list).mockReturnValue(new Promise(() => undefined))

    const wrapper = mount(SalesIntelligenceView)
    await Promise.resolve()

    expect(wrapper.text()).toContain('Carregando...')
  })

  it('shows a safe retry state when the API cannot be reached', async () => {
    vi.mocked(salesIntelligenceService.list).mockRejectedValue(new Error('network unavailable'))

    const wrapper = mount(SalesIntelligenceView)
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar as vendas')
    expect(wrapper.text()).toContain('Tentar novamente')
    expect(wrapper.text()).not.toContain('network unavailable')
  })
})

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
