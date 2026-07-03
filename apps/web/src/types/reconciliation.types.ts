export type ReconciliationCaseStatus =
  | 'PENDING'
  | 'AUTO_MATCHED'
  | 'MANUALLY_MATCHED'
  | 'RECONCILED'
  | 'UNMATCHED'
  | 'AMBIGUOUS'
  | 'AMOUNT_DIVERGENCE'
  | 'CURRENCY_DIVERGENCE'
  | 'STATUS_DIVERGENCE'
  | 'IGNORED'
  | 'RESOLVED_EXCEPTION'

export type ReconciliationDecisionAction =
  | 'MANUAL_MATCH'
  | 'RESOLVE_EXCEPTION'
  | 'IGNORE'
  | 'REOPEN'
  | 'COMMENT'

export interface ReconciliationCasePaymentSummary {
  id: string
  reference?: string | null
  amount: number
  currency: string
  providerPaymentId?: string | null
}

export interface ReconciliationCaseSettlementSummary {
  id: string
  providerEventId: string
  providerPaymentId?: string | null
  externalReference?: string | null
  occurredAt?: string | null
}

export interface ReconciliationCase {
  id: string
  provider: string
  status: ReconciliationCaseStatus
  matchType: string
  expectedAmountMinor?: string | null
  receivedAmountMinor?: string | null
  differenceAmountMinor?: string | null
  currency: string
  currencyExponent: number
  policyVersion: number
  matchedAt?: string | null
  reconciledAt?: string | null
  createdAt: string
  updatedAt: string
  settlementEvent: ReconciliationCaseSettlementSummary
  payment?: ReconciliationCasePaymentSummary | null
}

export interface ReconciliationCasesFilters {
  page?: number
  perPage?: number
  status?: ReconciliationCaseStatus
  provider?: string
  matchType?: string
}

export interface ReconciliationCasesMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ReconciliationCasesResponse {
  data: ReconciliationCase[]
  meta: ReconciliationCasesMeta
}

export interface CreateReconciliationDecisionPayload {
  action: ReconciliationDecisionAction
  reasonCode: string
  paymentId?: string
  comment?: string
}
