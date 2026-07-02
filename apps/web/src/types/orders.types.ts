export type InternalOrderStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'FULFILLED'

export interface InternalOrderItem {
  id: string
  tenantId: string
  orderId: string
  skuId: string
  warehouseId: string
  quantity: string
  reservationId?: string | null
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
