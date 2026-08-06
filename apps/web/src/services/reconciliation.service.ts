import { httpClient } from './http-client'
import type {
  CreateReconciliationDecisionPayload,
  ReconciliationCase,
  ReconciliationCasesFilters,
  ReconciliationCasesResponse,
  ReconciliationDashboard,
  ReconciliationReasonCode,
  ReconciliationTimeline,
} from '../types/reconciliation.types'

export class ReconciliationService {
  async listCases(params?: ReconciliationCasesFilters): Promise<ReconciliationCasesResponse> {
    const { data } = await httpClient.get<ReconciliationCasesResponse>('/reconciliation/cases', {
      params,
    })
    return data
  }

  async getDashboard(params?: ReconciliationCasesFilters): Promise<ReconciliationDashboard> {
    const { data } = await httpClient.get<ReconciliationDashboard>('/reconciliation/dashboard', {
      params,
    })
    return data
  }

  async getCase(caseId: string): Promise<ReconciliationCase> {
    const { data } = await httpClient.get<ReconciliationCase>(`/reconciliation/cases/${caseId}`)
    return data
  }

  async getTimeline(caseId: string): Promise<ReconciliationTimeline> {
    const { data } = await httpClient.get<ReconciliationTimeline>(
      `/reconciliation/cases/${caseId}/timeline`,
    )
    return data
  }

  async listReasonCodes(): Promise<ReconciliationReasonCode[]> {
    const { data } = await httpClient.get<{ data: ReconciliationReasonCode[] }>(
      '/reconciliation/cases/reason-codes',
    )
    return data.data
  }

  async createDecision(caseId: string, payload: CreateReconciliationDecisionPayload) {
    const { data } = await httpClient.post(`/reconciliation/cases/${caseId}/decisions`, payload)
    return data
  }

  async reprocessCase(caseId: string): Promise<ReconciliationCase> {
    const { data } = await httpClient.post<ReconciliationCase>(
      `/reconciliation/cases/${caseId}/reprocess`,
    )
    return data
  }
}

export const reconciliationService = new ReconciliationService()
