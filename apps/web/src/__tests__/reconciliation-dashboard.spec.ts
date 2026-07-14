import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReconciliationView from '../views/ReconciliationView.vue'
import { reconciliationService } from '../services/reconciliation.service'

vi.mock('../services/reconciliation.service', () => ({
  reconciliationService: {
    listCases: vi.fn<typeof reconciliationService.listCases>(),
    getDashboard: vi.fn<typeof reconciliationService.getDashboard>(),
    createDecision: vi.fn<typeof reconciliationService.createDecision>(),
  },
}))

describe('reconciliation dashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(reconciliationService.listCases).mockResolvedValue({
      data: [],
      meta: { page: 1, perPage: 20, total: 0, totalPages: 1 },
    })
    vi.mocked(reconciliationService.getDashboard).mockResolvedValue({
      kpis: {
        expectedAmountMinor: '35000',
        reconciledAmountMinor: '10000',
        pendingAmountMinor: '5000',
        divergentAmountMinor: '200',
        totalCases: 3,
        reconciledCases: 1,
        pendingCases: 1,
        divergentCases: 1,
      },
      byStatus: [
        { status: 'RECONCILED', count: 1, amountMinor: '10000' },
        { status: 'AMOUNT_DIVERGENCE', count: 1, amountMinor: '20000' },
      ],
      byProvider: [
        {
          provider: 'ASAAS',
          count: 3,
          expectedAmountMinor: '35000',
          receivedAmountMinor: '29800',
        },
      ],
      agingBuckets: [
        { key: '0_1', label: '0-1d', count: 0, amountMinor: '0' },
        { key: '2_3', label: '2-3d', count: 1, amountMinor: '5000' },
        { key: '4_7', label: '4-7d', count: 0, amountMinor: '0' },
        { key: '8_plus', label: '8+d', count: 1, amountMinor: '20000' },
      ],
      note: 'cash_reconciliation_not_operational_margin',
    })
  })

  it('renders KPI cards, aging buckets, and the cash reconciliation note', async () => {
    const wrapper = mount(ReconciliationView, {
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    await flushPromises()

    expect(reconciliationService.getDashboard).toHaveBeenCalled()
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(text).toContain('Esperado')
    expect(text).toContain('R$ 350,00')
    expect(wrapper.text()).toContain('Aging')
    expect(wrapper.text()).toContain('8+d')
    expect(wrapper.text()).toContain('Margem operacional não representa caixa conciliado')
  })
})

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}
