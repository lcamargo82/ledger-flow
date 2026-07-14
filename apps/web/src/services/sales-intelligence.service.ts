import { httpClient } from './http-client'
import type {
  SalesIntelligenceDetail,
  SalesIntelligenceFilters,
  SalesIntelligenceResponse,
  SalesIntelligenceSummary,
  SalesTimelineEvent,
} from '../types/sales-intelligence.types'

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
}

export const salesIntelligenceService = new SalesIntelligenceService()
