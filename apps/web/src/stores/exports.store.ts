import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { exportsService } from '../services/exports.service'
import type {
  CreateExportJobPayload,
  ExportJob,
  ExportJobsFilters,
  ExportJobsMeta,
} from '../types/exports.types'

export const useExportsStore = defineStore('exports', () => {
  const jobs = ref<ExportJob[]>([])
  const meta = ref<ExportJobsMeta>({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const filters = ref<ExportJobsFilters>({ page: 1, perPage: 20 })
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 403) return 'exports.errors.forbidden'
      if (err.response?.status === 400) return 'exports.errors.invalid'
    }
    return 'exports.errors.default'
  }

  const fetchJobs = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await exportsService.list(filters.value)
      jobs.value = response.data
      meta.value = response.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const setFilters = (nextFilters: Partial<ExportJobsFilters>) => {
    filters.value = { ...filters.value, ...nextFilters, page: 1 }
    fetchJobs()
  }

  const createJob = async (payload: CreateExportJobPayload) => {
    isMutating.value = true
    try {
      await exportsService.create(payload)
      await fetchJobs()
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const processPending = async () => {
    isMutating.value = true
    try {
      await exportsService.processPending()
      await fetchJobs()
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const cancelJob = async (id: string) => {
    isMutating.value = true
    try {
      await exportsService.cancel(id)
      await fetchJobs()
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const downloadJob = async (job: ExportJob) => {
    await exportsService.download(job)
  }

  return {
    jobs,
    meta,
    filters,
    isLoading,
    isMutating,
    error,
    fetchJobs,
    setFilters,
    createJob,
    processPending,
    cancelJob,
    downloadJob,
  }
})
