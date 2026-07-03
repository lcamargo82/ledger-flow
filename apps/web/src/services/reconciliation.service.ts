import { httpClient } from './http-client'
import type {
  CreateReconciliationDecisionPayload,
  ReconciliationCasesFilters,
  ReconciliationCasesResponse,
} from '../types/reconciliation.types'

export class ReconciliationService {
  async listCases(params?: ReconciliationCasesFilters): Promise<ReconciliationCasesResponse> {
    const { data } = await httpClient.get<ReconciliationCasesResponse>('/reconciliation/cases', {
      params,
    })
    return data
  }

  async createDecision(caseId: string, payload: CreateReconciliationDecisionPayload) {
    const { data } = await httpClient.post(`/reconciliation/cases/${caseId}/decisions`, payload)
    return data
  }
}

export const reconciliationService = new ReconciliationService()
