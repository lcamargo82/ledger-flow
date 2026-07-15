import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { financialIntelligenceService } from '../services/financial-intelligence.service'
import type {
  FinancialDashboard,
  FinancialFactsMeta,
  FinancialFilters,
  OrderFinancialFact,
} from '../types/financial-intelligence.types'

export const useFinancialIntelligenceStore = defineStore('financial-intelligence', () => {
  const dashboard = ref<FinancialDashboard | null>(null)
  const facts = ref<OrderFinancialFact[]>([])
  const meta = ref<FinancialFactsMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const filters = ref<FinancialFilters>({ page: 1, perPage: 10 })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 403) return 'financialIntelligence.errors.forbidden'
      if (err.response?.status === 400) return 'financialIntelligence.errors.invalid'
    }
    return 'financialIntelligence.errors.default'
  }

  const fetchAnalytics = async () => {
    isLoading.value = true
    error.value = null
    try {
      const [dashboardResponse, factsResponse] = await Promise.all([
        financialIntelligenceService.getDashboard(filters.value),
        financialIntelligenceService.listFacts(filters.value),
      ])
      dashboard.value = dashboardResponse
      facts.value = factsResponse.data
      meta.value = factsResponse.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const setFilters = (nextFilters: Partial<FinancialFilters>) => {
    filters.value = { ...filters.value, ...nextFilters, page: 1 }
    fetchAnalytics()
  }

  const setPage = (page: number) => {
    filters.value = { ...filters.value, page }
    fetchAnalytics()
  }

  return {
    dashboard,
    facts,
    meta,
    filters,
    isLoading,
    error,
    fetchAnalytics,
    setFilters,
    setPage,
  }
})
