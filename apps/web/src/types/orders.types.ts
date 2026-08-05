export type InternalOrderStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'FULFILLED'

export interface InternalOrderItem {
  id: string
  tenantId: string
  orderId: string
  skuId: string
  warehouseId: string
  quantity: string
  sku?: {
    skuDisplay: string
    product: { name: string }
  }
  warehouse?: {
    name: string
    code: string
  }
  reservationId?: string | null
  reservation?: {
    id: string
    status: 'ACTIVE' | 'RELEASED' | 'CONSUMED'
  } | null
  createdAt: string
  updatedAt: string
}

export interface OrderShippingSummary {
  id: string
  tenantId: string
  orderId: string
  provider: 'MOCK' | 'MERCADO_LIVRE'
  externalOrderId: string
  externalShipmentId?: string | null
  status?: string | null
  substatus?: string | null
  shippingMode?: string | null
  logisticType?: string | null
  handlingEstimateAt?: string | null
  deliveryEstimateAt?: string | null
  postedAt?: string | null
  trackingCodeMasked?: string | null
  source: string
  confidence: number
  lastSyncedAt: string
  createdAt: string
  updatedAt: string
}

export interface InternalOrder {
  id: string
  tenantId: string
  orderNumber: string
  status: InternalOrderStatus
  idempotencyKey: string
  customerName?: string | null
  notes?: string | null
  confirmedAt?: string | null
  cancelledAt?: string | null
  fulfilledAt?: string | null
  createdByUserId?: string | null
  createdAt: string
  updatedAt: string
  items: InternalOrderItem[]
  shippingSummaries: OrderShippingSummary[]
}

export interface OrdersMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface PaginatedOrdersResponse {
  data: InternalOrder[]
  meta: OrdersMeta
}

export interface CreateOrderItemRequest {
  skuId: string
  warehouseId: string
  quantity: number
}

export interface CreateOrderRequest {
  idempotencyKey: string
  customerName?: string
  notes?: string
  items: CreateOrderItemRequest[]
}

export interface OrderTransitionRequest {
  reasonCode: string
  idempotencyKey: string
  notes?: string
}

export interface OrderMutationResponse {
  order: InternalOrder
}
