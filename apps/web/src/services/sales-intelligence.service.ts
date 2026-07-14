import { httpClient } from './http-client'
import type {
  SalesIntelligenceFilters,
  SalesIntelligenceResponse,
  SalesIntelligenceSummary,
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
}

export const salesIntelligenceService = new SalesIntelligenceService()
