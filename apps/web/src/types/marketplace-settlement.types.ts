export type MarketplaceFinancialAccountStatus = 'ACTIVE' | 'ARCHIVED'
export type CashLedgerEntryType =
  | 'OPENING_BALANCE'
  | 'MANUAL_ADJUSTMENT'
  | 'SETTLEMENT_CREDIT'
  | 'SETTLEMENT_DEBIT'
  | 'PAYOUT'
  | 'REFUND'
  | 'FEE'

export interface MarketplaceFinancialAccount {
  id: string
  provider: string
  environment: string
  gatewayConfigurationId: string
  name: string
  currency: string
  status: MarketplaceFinancialAccountStatus
  openingBalanceMinor: string
  currentBalanceMinor: string
  createdAt: string
  updatedAt: string
}

export interface CashLedgerEntry {
  id: string
  type: CashLedgerEntryType
  amountMinor: string
  balanceAfterMinor: string
  currency: string
  reasonCode: string
  notes?: string | null
  occurredAt: string
  createdAt: string
}

export interface MarketplaceSettlementEvent {
  id: string
  provider: string
  providerEventId: string
  providerPaymentId?: string | null
  externalReference?: string | null
  eventType: string
  providerStatus?: string | null
  amountMinor?: string | null
  feeAmountMinor?: string | null
  netAmountMinor?: string | null
  currency: string
  occurredAt?: string | null
  availableAt?: string | null
  receivedAt: string
}

export interface MarketplaceSettlementImportedTotals {
  eventCount: number
  grossAmountMinor: string
  feeAmountMinor: string
  netAmountMinor: string
  currency: string
}

export interface MarketplaceSettlementSyncResult {
  provider: string
  pagesFetched: number
  received: number
  created: number
  updated: number
  duplicates: number
  from: string
  to: string
}

export interface MarketplaceSettlementCashPosition {
  openingBalanceMinor: string
  currentBalanceMinor: string
  releasedAmountMinor: string
  pendingAmountMinor: string
  blockedAmountMinor: string
  refundedAmountMinor: string
  payoutAmountMinor: string
  currency: string
}

export interface MarketplaceSettlementOperationalPnl {
  grossRevenueMinor: string
  feeAmountMinor: string
  shippingAmountMinor: string
  refundAmountMinor: string
  cogsAmountMinor: string
  netRevenueMinor: string
  grossMarginMinor: string
  matchedOrderCount: number
  currency: string
}

export interface MarketplaceSettlementDashboard {
  cashPosition: MarketplaceSettlementCashPosition
  operationalPnl: MarketplaceSettlementOperationalPnl
  note: string
}

export interface MarketplaceFinancialAccountsResponse {
  data: MarketplaceFinancialAccount[]
}

export interface CashLedgerEntriesResponse {
  data: CashLedgerEntry[]
  meta: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export interface MarketplaceSettlementEventsResponse {
  data: MarketplaceSettlementEvent[]
  meta: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export interface CreateMarketplaceFinancialAccountPayload {
  provider: 'MERCADO_PAGO'
  gatewayConfigurationId: string
  name: string
  currency?: string
  openingBalanceMinor: number
  reasonCode: string
  notes?: string
}

export interface CreateCashPositionAdjustmentPayload {
  amountMinor: number
  reasonCode: string
  notes: string
}

export interface SyncMarketplaceFinancialEventsPayload {
  from: string
  to: string
  maxPages?: number
}
