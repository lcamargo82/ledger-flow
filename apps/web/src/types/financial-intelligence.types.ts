import type { ChannelProvider } from './channels.types'

export interface OrderFinancialFact {
  id: string
  tenantId: string
  orderId: string
  version: number
  orderNumber: string
  orderStatus: string
  channelProvider?: ChannelProvider | null
  revenueAmount: string
  cogsAmount: string
  channelFeeAmount: string
  grossMarginAmount: string
  currency: string
  itemCount: number
  fulfilledAt?: string | null
  calculatedAt: string
  components: Record<string, unknown>
}

export interface FinancialDashboard {
  orderCount: number
  revenueAmount: string
  cogsAmount: string
  grossMarginAmount: string
  note: string
}

export interface FinancialFactsMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface FinancialFactsResponse {
  data: OrderFinancialFact[]
  meta: FinancialFactsMeta
}

export interface FinancialFilters {
  page?: number
  perPage?: number
  channelProvider?: ChannelProvider
  dateFrom?: string
  dateTo?: string
}
