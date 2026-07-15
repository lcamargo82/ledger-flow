import { httpClient } from './http-client'
import type {
  SalesIntelligenceDetail,
  SalesIntelligenceFilters,
  SalesIntelligenceResponse,
  SalesIntelligenceSummary,
  SalesTimelineEvent,
  SalesIntelligencePolicy,
} from '../types/sales-intelligence.types'
import type { ExportJob } from '../types/exports.types'

export class SalesIntelligenceService {
  async list(params?: SalesIntelligenceFilters): Promise<SalesIntelligenceResponse> {
    const { data } = await httpClient.get<SalesIntelligenceResponse>('/sales-intelligence', {
      params,
    })
    return data
  }

  async getSummary(params?: SalesIntelligenceFilters): Promise<SalesIntelligenceSummary> {
    const { data } = await httpClient.get<SalesIntelligenceSummary>('/sales-intelligence/summary', {
      params,
    })
    return data
  }

  async getDetail(orderId: string): Promise<SalesIntelligenceDetail> {
    const { data } = await httpClient.get<SalesIntelligenceDetail>(`/sales-intelligence/${orderId}`)
    return data
  }

  async getTimeline(orderId: string): Promise<SalesTimelineEvent[]> {
    const { data } = await httpClient.get<SalesTimelineEvent[]>(
      `/sales-intelligence/${orderId}/timeline`,
    )
    return data
  }

  async getPolicy(): Promise<SalesIntelligencePolicy> {
    const { data } = await httpClient.get<SalesIntelligencePolicy>('/sales-intelligence/policy')
    return data
  }

  async updatePolicy(policy: {
    lowMarginEnabled: boolean
    lowMarginThreshold: number
  }): Promise<SalesIntelligencePolicy> {
    const { data } = await httpClient.patch<SalesIntelligencePolicy>(
      '/sales-intelligence/policy',
      policy,
    )
    return data
  }

  async exportCsv(filters: SalesIntelligenceFilters): Promise<void> {
    const { page: _page, perPage: _perPage, ...exportFilters } = filters
    const { data: job } = await httpClient.post<ExportJob>(
      '/sales-intelligence/exports',
      exportFilters,
    )
    const { data } = await httpClient.post<{ processed: ExportJob[] }>(
      '/sales-intelligence/exports/process-pending',
    )
    const completed = data.processed.find((item) => item.id === job.id)
    if (!completed || completed.status !== 'COMPLETED') throw new Error('EXPORT_FAILED')
    const response = await httpClient.get<Blob>(
      `/sales-intelligence/exports/${completed.id}/download`,
      { responseType: 'blob' },
    )
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = completed.fileName ?? `sales-intelligence-${completed.id}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }
}

export const salesIntelligenceService = new SalesIntelligenceService()
