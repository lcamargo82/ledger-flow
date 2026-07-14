import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { salesIntelligenceService } from '../services/sales-intelligence.service'
import SalesIntelligenceView from '../views/SalesIntelligenceView.vue'

vi.mock('../services/sales-intelligence.service', () => ({
  salesIntelligenceService: {
    list: vi.fn<typeof salesIntelligenceService.list>(),
    getSummary: vi.fn<typeof salesIntelligenceService.getSummary>(),
    getDetail: vi.fn<typeof salesIntelligenceService.getDetail>(),
    getTimeline: vi.fn<typeof salesIntelligenceService.getTimeline>(),
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
    vi.mocked(salesIntelligenceService.getDetail).mockResolvedValue({
      ...row,
      permissions: {
        canViewProfitability: true,
        canViewSettlement: true,
        canViewPayment: true,
        canViewInventory: true,
      },
      items: [
        {
          orderItemId: 'item-1',
          skuId: 'sku-1',
          sku: 'CAM-001-P',
          productName: 'Camiseta LedgerFlow',
          quantity: '2',
          stockStatus: 'CONSUMED',
          warehouseName: 'Estoque principal',
          warehouseCode: 'MAIN',
          unitCostMinor: '4000',
          cogsAmountMinor: '8000',
        },
      ],
      payment: { status: 'approved', paidAmountMinor: '15000' },
      financial: {
        grossAmountMinor: '15000',
        feeAmountMinor: '2140',
        shippingCostMinor: '500',
        netAmountMinor: '12860',
        netAmountSource: 'REALIZED',
        cogsAmountMinor: '8000',
        estimatedProfitMinor: '4360',
        realizedProfitMinor: '4360',
        marginPercent: '29.07',
        profitabilityStatus: 'PROFIT',
        profitSource: 'REALIZED',
      },
      shipping: { status: 'DELIVERED', trackingCodeMasked: '***1234' },
      settlement: { status: 'RECONCILED', cashStatus: 'REALIZED' },
    })
    vi.mocked(salesIntelligenceService.getTimeline).mockResolvedValue([
      {
        id: 'event-1',
        occurredAt: '2026-07-14T13:00:00.000Z',
        source: 'SETTLEMENT',
        type: 'settlement.reconciled',
        titleKey: 'salesIntelligence.timeline.settlement.title',
        messageKey: 'salesIntelligence.timeline.settlement.message',
        severity: 'SUCCESS',
        metadata: {},
      },
    ])
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
    await flushPromises()

    expect(wrapper.get('[data-testid="sales-order-drawer"]').attributes('role')).toBe('dialog')
    const drawerText = wrapper.text().replace(/\s+/g, ' ')
    expect(drawerText).toContain('CAM-001-P')
    expect(drawerText).toContain('Camiseta LedgerFlow')
    expect(drawerText).toContain('Quantidade: 2')
    expect(drawerText).toContain('Estoque principal · MAIN')
    expect(drawerText).toContain('R$ 80,00')
    expect(drawerText).toContain('R$ 43,60')
    expect(drawerText).toContain('29,07%')
    expect(drawerText).toContain('Entregue')
    expect(drawerText).toContain('Conciliado')
    expect(salesIntelligenceService.getDetail).toHaveBeenCalledWith('order-1')
    expect(salesIntelligenceService.getTimeline).toHaveBeenCalledWith('order-1')
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
