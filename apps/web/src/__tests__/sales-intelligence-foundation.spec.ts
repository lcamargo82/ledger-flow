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

describe('sales intelligence foundation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(salesIntelligenceService.list).mockResolvedValue({
      data: [],
      meta: { page: 1, perPage: 20, total: 0, totalPages: 1 },
    })
    vi.mocked(salesIntelligenceService.getSummary).mockResolvedValue({
      orderCount: 0,
      paidAmountMinor: '0',
      feeAmountMinor: '0',
      netAmountMinor: '0',
      realizedNetAmountMinor: '0',
      reconciledNetAmountMinor: '0',
      estimatedNetAmountMinor: '0',
      stockIssueCount: 0,
      currency: 'BRL',
    })
  })

  it('renders the safe foundation shell without profitability data', () => {
    const wrapper = mount(SalesIntelligenceView)

    expect(wrapper.text()).toContain('Inteligência de vendas')
    expect(wrapper.text()).toContain('Pedido, pagamento, taxa, líquido e estoque')
    expect(wrapper.text()).not.toContain('Lucro')
    expect(wrapper.text()).not.toContain('Margem')
  })
})
