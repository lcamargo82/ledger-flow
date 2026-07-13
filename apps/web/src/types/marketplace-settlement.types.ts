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
