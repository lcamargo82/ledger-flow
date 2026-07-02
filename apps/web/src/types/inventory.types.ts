export type InventoryMovementType =
  | 'RECEIPT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'RESERVATION'
  | 'RESERVATION_RELEASE'
  | 'FULFILLMENT'
  | 'RETURN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'

export type InventoryReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONSUMED'

export interface Warehouse {
  id: string
  tenantId: string
  code: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryBalance {
  id: string
  tenantId: string
  skuId: string
  warehouseId: string
  onHandQuantity: string
  reservedQuantity: string
  availableQuantity: string
  version: number
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  tenantId: string
  skuId: string
  warehouseId: string
  type: InventoryMovementType
  quantityDelta: string
  unitCost?: string | null
  sourceType: string
  sourceId: string
  idempotencyKey: string
  reasonCode?: string | null
  notes?: string | null
  occurredAt: string
  createdByUserId?: string | null
  createdAt: string
}

export interface InventoryReservation {
  id: string
  tenantId: string
  skuId: string
  warehouseId: string
  quantity: string
  status: InventoryReservationStatus
  sourceType: string
  sourceId: string
  idempotencyKey: string
  reasonCode: string
  notes?: string | null
  createdByUserId?: string | null
  releasedAt?: string | null
  consumedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginatedMeta
}

export interface CreateWarehouseRequest {
  code: string
  name: string
}

export interface UpdateWarehouseRequest {
  name?: string
  isActive?: boolean
}

export interface RecordAdjustmentRequest {
  skuId: string
  warehouseId: string
  type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'
  quantity: number
  reasonCode: string
  notes?: string
}

export interface ReserveStockRequest {
  skuId: string
  warehouseId: string
  quantity: number
  sourceType: string
  sourceId: string
  idempotencyKey: string
  reasonCode: string
  notes?: string
}

export interface ReservationTransitionRequest {
  reasonCode: string
  idempotencyKey: string
  notes?: string
}

export interface InventoryAdjustmentResponse {
  movement: InventoryMovement
  balance: InventoryBalance
}

export interface InventoryReservationOperationResponse {
  reservation: InventoryReservation
  movement: InventoryMovement
  balance: InventoryBalance
}
