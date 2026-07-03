import { httpClient } from './http-client'
import type {
  FinancialDashboard,
  FinancialFactsResponse,
  FinancialFilters,
} from '../types/financial-intelligence.types'

export class FinancialIntelligenceService {
  async getDashboard(params?: FinancialFilters): Promise<FinancialDashboard> {
    const { data } = await httpClient.get<FinancialDashboard>('/financial-intelligence/dashboard', {
      params,
    })
    return data
  }

  async listFacts(params?: FinancialFilters): Promise<FinancialFactsResponse> {
    const { data } = await httpClient.get<FinancialFactsResponse>(
      '/financial-intelligence/order-facts',
      { params },
    )
    return data
  }
}

export const financialIntelligenceService = new FinancialIntelligenceService()
