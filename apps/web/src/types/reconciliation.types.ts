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

export interface ReconciliationCaseOrderSummary {
  id: string
  orderNumber: string
  status: string
}

export interface ReconciliationCaseSettlementSummary {
  id: string
  providerEventId: string
  providerPaymentId?: string | null
  externalReference?: string | null
  eventType?: string
  providerStatus?: string | null
  amountMinor?: string | null
  feeAmountMinor?: string | null
  netAmountMinor?: string | null
  currency?: string
  availableAt?: string | null
  occurredAt?: string | null
  receivedAt?: string | null
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
  order?: ReconciliationCaseOrderSummary | null
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

export interface ReconciliationDashboardKpis {
  expectedAmountMinor: string
  reconciledAmountMinor: string
  pendingAmountMinor: string
  divergentAmountMinor: string
  totalCases: number
  reconciledCases: number
  pendingCases: number
  divergentCases: number
}

export interface ReconciliationDashboardStatus {
  status: ReconciliationCaseStatus
  count: number
  amountMinor: string
}

export interface ReconciliationDashboardProvider {
  provider: string
  count: number
  expectedAmountMinor: string
  receivedAmountMinor: string
}

export interface ReconciliationDashboardAgingBucket {
  key: string
  label: string
  count: number
  amountMinor: string
}

export interface ReconciliationDashboard {
  kpis: ReconciliationDashboardKpis
  byStatus: ReconciliationDashboardStatus[]
  byProvider: ReconciliationDashboardProvider[]
  agingBuckets: ReconciliationDashboardAgingBucket[]
  note: string
}

export interface CreateReconciliationDecisionPayload {
  action: ReconciliationDecisionAction
  reasonCode: string
  paymentId?: string
  comment?: string
}

export interface ReconciliationDecision {
  id: string
  action: ReconciliationDecisionAction
  reasonCode: string
  comment?: string | null
  previousStatus: ReconciliationCaseStatus
  nextStatus: ReconciliationCaseStatus
  paymentId?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface ReconciliationTimelineEvent {
  type: 'SETTLEMENT_EVENT_RECEIVED' | 'CASE_CREATED' | 'DECISION_RECORDED'
  occurredAt: string
  settlementEvent?: ReconciliationCaseSettlementSummary
  case?: Pick<ReconciliationCase, 'id' | 'status' | 'matchType'>
  decision?: ReconciliationDecision
}

export interface ReconciliationTimeline {
  case: ReconciliationCase
  evidence: {
    settlementEvent: ReconciliationCaseSettlementSummary
    payment?: ReconciliationCasePaymentSummary | null
    order?: ReconciliationCaseOrderSummary | null
  }
  decisions: ReconciliationDecision[]
  events: ReconciliationTimelineEvent[]
}

export interface ReconciliationReasonCode {
  code: string
  action: ReconciliationDecisionAction
  labelKey: string
  requiresComment: boolean
}
