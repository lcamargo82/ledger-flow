import {
  InventoryBalance,
  InventoryMovement,
  InventoryMovementType,
  ProductSku,
  Warehouse,
} from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateWarehouseData {
  tenantId: string;
  code: string;
  name: string;
}

export interface UpdateWarehouseData {
  name?: string;
  isActive?: boolean;
}

export interface ListWarehousesParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  search?: string;
  isActive?: boolean;
}

export interface AdjustmentData {
  tenantId: string;
  skuId: string;
  warehouseId: string;
  type: InventoryMovementType;
  quantityDelta: number;
  unitCost?: number | null;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  reasonCode: string;
  notes?: string | null;
  occurredAt: Date;
  createdByUserId: string;
}

export interface ListInventoryParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  skuId?: string;
  warehouseId?: string;
  type?: InventoryMovementType;
}

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface InventoryRepository {
  findWarehouseByCode(code: string, tenantId: string): Promise<Warehouse | null>;
  findWarehouseById(id: string, tenantId: string): Promise<Warehouse | null>;
  createWarehouse(data: CreateWarehouseData): Promise<Warehouse>;
  updateWarehouse(id: string, tenantId: string, data: UpdateWarehouseData): Promise<Warehouse>;
  listWarehouses(params: ListWarehousesParams): Promise<PaginatedResult<Warehouse>>;
  findSkuById(id: string, tenantId: string): Promise<ProductSku | null>;
  recordAdjustment(
    data: AdjustmentData,
  ): Promise<{ movement: InventoryMovement; balance: InventoryBalance }>;
  listBalances(params: ListInventoryParams): Promise<PaginatedResult<InventoryBalance>>;
  listMovements(params: ListInventoryParams): Promise<PaginatedResult<InventoryMovement>>;
}
