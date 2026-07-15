export type SalesIntelligenceNetAmountSource =
  | 'REALIZED'
  | 'RECONCILED'
  | 'ESTIMATED'
  | 'UNAVAILABLE'

export type SalesIntelligenceStockStatus =
  | 'PENDING'
  | 'RESERVED'
  | 'CONSUMED'
  | 'RELEASED'
  | 'DIVERGENT'
  | 'UNAVAILABLE'

export interface SalesIntelligenceItem {
  orderItemId: string
  skuId: string
  sku?: string | null
  productName?: string | null
  quantity: string
  stockStatus: SalesIntelligenceStockStatus
}

export type SalesIntelligenceProfitabilityStatus =
  | 'PROFIT'
  | 'LOSS'
  | 'BREAK_EVEN'
  | 'MISSING_COST'
  | 'UNAVAILABLE'

export type SalesIntelligenceProfitSource = 'REALIZED' | 'ESTIMATED' | 'UNAVAILABLE'

export interface SalesIntelligenceDetailItem extends Omit<SalesIntelligenceItem, 'stockStatus'> {
  stockStatus: SalesIntelligenceStockStatus | null
  warehouseName?: string | null
  warehouseCode?: string | null
  unitCostMinor?: string | null
  cogsAmountMinor?: string | null
}

export interface SalesIntelligenceOrder {
  orderId: string
  orderNumber: string
  externalOrderId?: string | null
  soldAt: string
  orderStatus: string
  items: SalesIntelligenceItem[]
  paymentStatus?: string | null
  paidAmountMinor?: string | null
  feeAmountMinor?: string | null
  netAmountMinor?: string | null
  netAmountSource: SalesIntelligenceNetAmountSource
  stockStatus: SalesIntelligenceStockStatus
  currency: string
}

export interface SalesIntelligenceDetail extends Omit<SalesIntelligenceOrder, 'items'> {
  permissions: {
    canViewProfitability: boolean
    canViewSettlement: boolean
    canViewPayment: boolean
    canViewInventory: boolean
  }
  items: SalesIntelligenceDetailItem[]
  payment: {
    status?: string | null
    paidAmountMinor?: string | null
    reference?: string | null
  } | null
  financial: {
    grossAmountMinor?: string | null
    feeAmountMinor?: string | null
    shippingCostMinor?: string | null
    netAmountMinor?: string | null
    netAmountSource: SalesIntelligenceNetAmountSource
    cogsAmountMinor?: string | null
    estimatedProfitMinor?: string | null
    realizedProfitMinor?: string | null
    marginPercent?: string | null
    profitabilityStatus: SalesIntelligenceProfitabilityStatus
    profitSource: SalesIntelligenceProfitSource
  }
  shipping: {
    status: string
    providerStatus?: string | null
    trackingCodeMasked?: string | null
    deliveryEstimateAt?: string | null
  }
  settlement: {
    caseId?: string
    status: string
    cashStatus: string
    providerStatus?: string | null
    availableAt?: string | null
    amountMinor?: string | null
    feeAmountMinor?: string | null
    netAmountMinor?: string | null
    currency?: string
  } | null
}

export interface SalesTimelineEvent {
  id: string
  occurredAt: string
  source: string
  type: string
  titleKey: string
  messageKey: string
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  metadata: Record<string, unknown>
}

export interface SalesIntelligenceMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface SalesIntelligenceResponse {
  data: SalesIntelligenceOrder[]
  meta: SalesIntelligenceMeta
}

export interface SalesIntelligenceSummary {
  orderCount: number
  paidAmountMinor: string
  feeAmountMinor: string
  netAmountMinor: string
  realizedNetAmountMinor: string
  reconciledNetAmountMinor: string
  estimatedNetAmountMinor: string
  stockIssueCount: number
  currency: string
}

export interface SalesIntelligenceFilters {
  page?: number
  perPage?: number
  dateFrom?: string
  dateTo?: string
  orderReference?: string
  paymentStatus?: string
  stockStatus?: SalesIntelligenceStockStatus
}

export interface SalesIntelligencePolicy {
  lowMarginEnabled: boolean
  lowMarginThreshold: string
}
