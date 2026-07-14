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
