import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { financialIntelligenceService } from '../services/financial-intelligence.service'
import AnalyticsView from '../views/AnalyticsView.vue'

vi.mock('../services/financial-intelligence.service', () => ({
  financialIntelligenceService: {
    getDashboard: vi.fn<typeof financialIntelligenceService.getDashboard>(),
    listFacts: vi.fn<typeof financialIntelligenceService.listFacts>(),
  },
}))

describe('analytics metrics', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(financialIntelligenceService.getDashboard).mockResolvedValue({
      orderCount: 12,
      revenueAmount: '150.50',
      cogsAmount: '42.10',
      grossMarginAmount: '88.40',
      note: 'operational_margin_not_cash_reconciliation',
    })
    vi.mocked(financialIntelligenceService.listFacts).mockResolvedValue({
      data: [],
      meta: { page: 1, perPage: 10, total: 0, totalPages: 1 },
    })
  })

  it('uses the shared compact metric grid with four consistent cards', async () => {
    const wrapper = mount(AnalyticsView)
    await flushPromises()

    expect(wrapper.get('[data-testid="metric-grid"]').attributes('aria-label')).toBe(
      'Indicadores financeiros',
    )
    expect(wrapper.findAll('[data-testid="metric-card"]')).toHaveLength(4)
    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('R$ 150,50')
    expect(text).toContain('R$ 42,10')
    expect(text).toContain('R$ 88,40')
  })
})

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
