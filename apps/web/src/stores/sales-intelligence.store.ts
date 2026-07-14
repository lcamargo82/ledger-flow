import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { salesIntelligenceService } from '../services/sales-intelligence.service'
import type {
  SalesIntelligenceFilters,
  SalesIntelligenceMeta,
  SalesIntelligenceOrder,
  SalesIntelligenceSummary,
} from '../types/sales-intelligence.types'

export const useSalesIntelligenceStore = defineStore('sales-intelligence', () => {
  const orders = ref<SalesIntelligenceOrder[]>([])
  const summary = ref<SalesIntelligenceSummary | null>(null)
  const meta = ref<SalesIntelligenceMeta>({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const filters = ref<SalesIntelligenceFilters>({ page: 1, perPage: 20 })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 403) return 'salesIntelligence.errors.forbidden'
      if (err.response?.status === 400) return 'salesIntelligence.errors.invalid'
    }
    return 'salesIntelligence.errors.default'
  }

  const fetchOverview = async () => {
    isLoading.value = true
    error.value = null
    try {
      const [ordersResponse, summaryResponse] = await Promise.all([
        salesIntelligenceService.list(filters.value),
        salesIntelligenceService.getSummary(filters.value),
      ])
      orders.value = ordersResponse.data
      meta.value = ordersResponse.meta
      summary.value = summaryResponse
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      isLoading.value = false
    }
  }

  const setFilters = async (nextFilters: Partial<SalesIntelligenceFilters>) => {
    filters.value = { ...filters.value, ...nextFilters, page: 1 }
    await fetchOverview()
  }

  const setPage = async (page: number) => {
    filters.value = { ...filters.value, page }
    await fetchOverview()
  }

  return {
    orders,
    summary,
    meta,
    filters,
    isLoading,
    error,
    fetchOverview,
    setFilters,
    setPage,
  }
})
