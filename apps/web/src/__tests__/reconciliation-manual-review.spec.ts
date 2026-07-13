import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReconciliationView from '../views/ReconciliationView.vue'
import { reconciliationService } from '../services/reconciliation.service'

vi.mock('../services/reconciliation.service', () => ({
  reconciliationService: {
    listCases: vi.fn(),
    getDashboard: vi.fn(),
    getCase: vi.fn(),
    getTimeline: vi.fn(),
    listReasonCodes: vi.fn(),
    createDecision: vi.fn(),
  },
}))

describe('reconciliation manual review', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(reconciliationService.listCases).mockResolvedValue({
      data: [
        {
          id: 'case-1',
          provider: 'ASAAS',
          status: 'AMBIGUOUS',
          matchType: 'AMOUNT_CURRENCY_TIME_CANDIDATE',
          expectedAmountMinor: '12345',
          receivedAmountMinor: '12345',
          differenceAmountMinor: '0',
          currency: 'BRL',
          currencyExponent: 2,
          policyVersion: 1,
          createdAt: '2026-07-03T10:00:00.000Z',
          updatedAt: '2026-07-03T10:00:00.000Z',
          settlementEvent: {
            id: 'settlement-1',
            providerEventId: 'evt-1',
            providerPaymentId: 'pay-1',
            externalReference: 'LF-123',
            occurredAt: '2026-07-03T10:00:00.000Z',
          },
          payment: null,
        },
      ],
      meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
    })
    vi.mocked(reconciliationService.getDashboard).mockResolvedValue({
      kpis: {
        expectedAmountMinor: '12345',
        reconciledAmountMinor: '0',
        pendingAmountMinor: '12345',
        divergentAmountMinor: '0',
        totalCases: 1,
        reconciledCases: 0,
        pendingCases: 1,
        divergentCases: 0,
      },
      byStatus: [{ status: 'AMBIGUOUS', count: 1, amountMinor: '12345' }],
      byProvider: [
        {
          provider: 'ASAAS',
          count: 1,
          expectedAmountMinor: '12345',
          receivedAmountMinor: '12345',
        },
      ],
      agingBuckets: [
        { key: '0_1', label: '0-1d', count: 1, amountMinor: '12345' },
        { key: '2_3', label: '2-3d', count: 0, amountMinor: '0' },
        { key: '4_7', label: '4-7d', count: 0, amountMinor: '0' },
        { key: '8_plus', label: '8+d', count: 0, amountMinor: '0' },
      ],
      note: 'cash_reconciliation_not_operational_margin',
    })
    vi.mocked(reconciliationService.getCase).mockResolvedValue({
      id: 'case-1',
      provider: 'ASAAS',
      status: 'AMBIGUOUS',
      matchType: 'AMOUNT_CURRENCY_TIME_CANDIDATE',
      expectedAmountMinor: '12345',
      receivedAmountMinor: '12345',
      differenceAmountMinor: '0',
      currency: 'BRL',
      currencyExponent: 2,
      policyVersion: 1,
      createdAt: '2026-07-03T10:00:00.000Z',
      updatedAt: '2026-07-03T10:00:00.000Z',
      settlementEvent: {
        id: 'settlement-1',
        providerEventId: 'evt-1',
        providerPaymentId: 'pay-1',
        externalReference: 'LF-123',
        occurredAt: '2026-07-03T10:00:00.000Z',
      },
      payment: null,
    })
    vi.mocked(reconciliationService.getTimeline).mockResolvedValue({
      case: {
        id: 'case-1',
        provider: 'ASAAS',
        status: 'AMBIGUOUS',
        matchType: 'AMOUNT_CURRENCY_TIME_CANDIDATE',
        expectedAmountMinor: '12345',
        receivedAmountMinor: '12345',
        differenceAmountMinor: '0',
        currency: 'BRL',
        currencyExponent: 2,
        policyVersion: 1,
        createdAt: '2026-07-03T10:00:00.000Z',
        updatedAt: '2026-07-03T10:00:00.000Z',
        settlementEvent: {
          id: 'settlement-1',
          providerEventId: 'evt-1',
          providerPaymentId: 'pay-1',
          externalReference: 'LF-123',
          occurredAt: '2026-07-03T10:00:00.000Z',
        },
        payment: null,
      },
      evidence: {
        settlementEvent: {
          id: 'settlement-1',
          providerEventId: 'evt-1',
          providerPaymentId: 'pay-1',
          externalReference: 'LF-123',
          netAmountMinor: '12345',
          occurredAt: '2026-07-03T10:00:00.000Z',
        },
        payment: null,
        order: null,
      },
      decisions: [],
      events: [{ type: 'CASE_CREATED', occurredAt: '2026-07-03T10:00:00.000Z' }],
    })
    vi.mocked(reconciliationService.listReasonCodes).mockResolvedValue([
      {
        code: 'OPERATIONAL_NOTE',
        action: 'COMMENT',
        labelKey: 'reconciliation.reasonCodes.OPERATIONAL_NOTE',
        requiresComment: false,
      },
    ])
  })

  it('renders cases and opens the reusable decision modal with a required reason code', async () => {
    const wrapper = mount(ReconciliationView, {
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('case-1')
    expect(wrapper.text()).toContain('AMBIGUOUS')

    await wrapper.get('[data-testid="open-decision-modal"]').trigger('click')

    expect(wrapper.text()).toContain('Registrar decisão')
    await flushPromises()
    expect(wrapper.text()).toContain('Evidências')
    expect(wrapper.text()).toContain('pay-1')
    expect(wrapper.get('[name="reasonCode"]').attributes('required')).toBeDefined()
  })
})

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}
