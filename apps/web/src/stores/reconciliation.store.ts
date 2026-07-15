import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { reconciliationService } from '../services/reconciliation.service'
import type {
  CreateReconciliationDecisionPayload,
  ReconciliationCase,
  ReconciliationCasesFilters,
  ReconciliationCasesMeta,
  ReconciliationDashboard,
  ReconciliationReasonCode,
  ReconciliationTimeline,
} from '../types/reconciliation.types'

export const useReconciliationStore = defineStore('reconciliation', () => {
  const cases = ref<ReconciliationCase[]>([])
  const dashboard = ref<ReconciliationDashboard | null>(null)
  const selectedCase = ref<ReconciliationCase | null>(null)
  const selectedTimeline = ref<ReconciliationTimeline | null>(null)
  const reasonCodes = ref<ReconciliationReasonCode[]>([])
  const meta = ref<ReconciliationCasesMeta>({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const filters = ref<ReconciliationCasesFilters>({ page: 1, perPage: 20 })
  const isLoading = ref(false)
  const isMutating = ref(false)
  const isReviewLoading = ref(false)
  const error = ref<string | null>(null)

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 403) return 'reconciliation.errors.forbidden'
      if (err.response?.status === 400) return 'reconciliation.errors.invalid'
    }
    return 'reconciliation.errors.default'
  }

  const fetchCases = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await reconciliationService.listCases(filters.value)
      cases.value = response.data
      meta.value = response.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchDashboard = async () => {
    isLoading.value = true
    error.value = null
    try {
      dashboard.value = await reconciliationService.getDashboard(filters.value)
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchOverview = async () => {
    isLoading.value = true
    error.value = null
    try {
      const [casesResponse, dashboardResponse] = await Promise.all([
        reconciliationService.listCases(filters.value),
        reconciliationService.getDashboard(filters.value),
      ])
      cases.value = casesResponse.data
      meta.value = casesResponse.meta
      dashboard.value = dashboardResponse
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createDecision = async (caseId: string, payload: CreateReconciliationDecisionPayload) => {
    isMutating.value = true
    error.value = null
    try {
      await reconciliationService.createDecision(caseId, payload)
      await fetchOverview()
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const fetchReviewContext = async (caseId: string) => {
    isReviewLoading.value = true
    error.value = null
    try {
      const [caseDetail, timeline, reasonCodeList] = await Promise.all([
        reconciliationService.getCase(caseId),
        reconciliationService.getTimeline(caseId),
        reasonCodes.value.length
          ? Promise.resolve(reasonCodes.value)
          : reconciliationService.listReasonCodes(),
      ])
      selectedCase.value = caseDetail
      selectedTimeline.value = timeline
      reasonCodes.value = reasonCodeList
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isReviewLoading.value = false
    }
  }

  const clearReviewContext = () => {
    selectedCase.value = null
    selectedTimeline.value = null
  }

  const setPage = (page: number) => {
    filters.value = { ...filters.value, page }
    fetchOverview()
  }

  return {
    cases,
    dashboard,
    selectedCase,
    selectedTimeline,
    reasonCodes,
    meta,
    filters,
    isLoading,
    isMutating,
    isReviewLoading,
    error,
    fetchCases,
    fetchDashboard,
    fetchOverview,
    fetchReviewContext,
    clearReviewContext,
    createDecision,
    setPage,
  }
})
