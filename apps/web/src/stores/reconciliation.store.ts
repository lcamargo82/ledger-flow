import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { reconciliationService } from '../services/reconciliation.service'
import type {
  CreateReconciliationDecisionPayload,
  ReconciliationCase,
  ReconciliationCasesFilters,
  ReconciliationCasesMeta,
} from '../types/reconciliation.types'

export const useReconciliationStore = defineStore('reconciliation', () => {
  const cases = ref<ReconciliationCase[]>([])
  const meta = ref<ReconciliationCasesMeta>({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const filters = ref<ReconciliationCasesFilters>({ page: 1, perPage: 20 })
  const isLoading = ref(false)
  const isMutating = ref(false)
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

  const createDecision = async (caseId: string, payload: CreateReconciliationDecisionPayload) => {
    isMutating.value = true
    error.value = null
    try {
      await reconciliationService.createDecision(caseId, payload)
      await fetchCases()
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  return {
    cases,
    meta,
    filters,
    isLoading,
    isMutating,
    error,
    fetchCases,
    createDecision,
  }
})
