import {
  InventoryBalance,
  InventoryMovement,
  InventoryMovementType,
  InventoryReservation,
  InventoryReservationStatus,
  InventoryTransfer,
  InventoryTransferItem,
  InventoryTransferStatus,
  CycleCount,
  CycleCountItem,
  CycleCountStatus,
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

export interface ReservationData {
  tenantId: string;
  skuId: string;
  warehouseId: string;
  quantity: number;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  reasonCode: string;
  notes?: string | null;
  createdByUserId: string;
}

export interface ReservationTransitionData {
  reservationId: string;
  tenantId: string;
  idempotencyKey: string;
  reasonCode: string;
  notes?: string | null;
  actorUserId: string;
}

export interface ReservationOperationResult {
  reservation: InventoryReservation;
  movement: InventoryMovement;
  balance: InventoryBalance;
  outboxEvent?: { id: string; eventType: string };
}

export type InventoryTransferWithItems = InventoryTransfer & {
  items: InventoryTransferItem[];
};

export interface InventoryTransferItemData {
  skuId: string;
  quantity: number;
  unitCostSnapshot?: number | null;
}

export interface CreateInventoryTransferData {
  tenantId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  reasonCode: string;
  notes?: string | null;
  idempotencyKey: string;
  createdByUserId: string;
  items: InventoryTransferItemData[];
}

export interface UpdateInventoryTransferDraftData {
  transferId: string;
  tenantId: string;
  reasonCode?: string;
  notes?: string | null;
  items?: InventoryTransferItemData[];
}

export interface InventoryTransferTransitionData {
  transferId: string;
  tenantId: string;
  actorUserId: string;
}

export interface CompleteInventoryTransferData extends InventoryTransferTransitionData {
  idempotencyKey: string;
}

export interface CancelInventoryTransferData extends InventoryTransferTransitionData {
  reasonCode: string;
  notes?: string | null;
}

export interface InventoryTransferCompletionResult {
  transfer: InventoryTransferWithItems;
  movements: InventoryMovement[];
  balances: InventoryBalance[];
  outboxEvent?: { id: string; eventType: string };
}

export type CycleCountWithItems = CycleCount & {
  items: CycleCountItem[];
};

export interface CycleCountItemData {
  skuId: string;
}

export interface CreateCycleCountData {
  tenantId: string;
  warehouseId: string;
  reasonCode?: string | null;
  notes?: string | null;
  idempotencyKey: string;
  createdByUserId: string;
  items: CycleCountItemData[];
}

export interface CycleCountTransitionData {
  cycleCountId: string;
  tenantId: string;
  actorUserId: string;
}

export interface CountCycleCountItemData extends CycleCountTransitionData {
  itemId: string;
  countedQuantity: number;
}

export interface ApproveCycleCountData extends CycleCountTransitionData {
  reasonCode: string;
  idempotencyKey: string;
  notes?: string | null;
}

export interface CancelCycleCountData extends CycleCountTransitionData {
  reasonCode: string;
  notes?: string | null;
}

export interface CycleCountApprovalResult {
  cycleCount: CycleCountWithItems;
  movements: InventoryMovement[];
  balances: InventoryBalance[];
  outboxEvent?: { id: string; eventType: string };
}

export interface ListInventoryParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  skuId?: string;
  warehouseId?: string;
  type?: InventoryMovementType;
  status?: InventoryReservationStatus;
}

export interface ListInventoryTransfersParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  status?: InventoryTransferStatus;
  warehouseId?: string;
}

export interface ListCycleCountsParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  status?: CycleCountStatus;
  warehouseId?: string;
}

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface InventoryRepository {
  findWarehouseByCode(code: string, tenantId: string): Promise<Warehouse | null>;
  findWarehouseById(id: string, tenantId: string): Promise<Warehouse | null>;
  createWarehouse(data: CreateWarehouseData): Promise<Warehouse>;
  updateWarehouse(id: string, tenantId: string, data: UpdateWarehouseData): Promise<Warehouse>;
  listWarehouses(params: ListWarehousesParams): Promise<PaginatedResult<Warehouse>>;
  findSkuById(id: string, tenantId: string): Promise<ProductSku | null>;
  findSkuByCode(code: string, tenantId: string): Promise<ProductSku | null>;
  recordAdjustment(
    data: AdjustmentData,
  ): Promise<{ movement: InventoryMovement; balance: InventoryBalance }>;
  reserveStock(data: ReservationData): Promise<ReservationOperationResult>;
  releaseReservation(data: ReservationTransitionData): Promise<ReservationOperationResult>;
  consumeReservation(data: ReservationTransitionData): Promise<ReservationOperationResult>;
  listReservations(params: ListInventoryParams): Promise<PaginatedResult<InventoryReservation>>;
  listBalances(params: ListInventoryParams): Promise<PaginatedResult<InventoryBalance>>;
  listMovements(params: ListInventoryParams): Promise<PaginatedResult<InventoryMovement>>;
  createTransfer(data: CreateInventoryTransferData): Promise<InventoryTransferWithItems>;
  listTransfers(
    params: ListInventoryTransfersParams,
  ): Promise<PaginatedResult<InventoryTransferWithItems>>;
  findTransferById(id: string, tenantId: string): Promise<InventoryTransferWithItems | null>;
  updateTransferDraft(data: UpdateInventoryTransferDraftData): Promise<InventoryTransferWithItems>;
  startTransfer(data: InventoryTransferTransitionData): Promise<InventoryTransferWithItems>;
  completeTransfer(data: CompleteInventoryTransferData): Promise<InventoryTransferCompletionResult>;
  cancelTransfer(data: CancelInventoryTransferData): Promise<InventoryTransferWithItems>;
  createCycleCount(data: CreateCycleCountData): Promise<CycleCountWithItems>;
  listCycleCounts(params: ListCycleCountsParams): Promise<PaginatedResult<CycleCountWithItems>>;
  findCycleCountById(id: string, tenantId: string): Promise<CycleCountWithItems | null>;
  openCycleCount(data: CycleCountTransitionData): Promise<CycleCountWithItems>;
  countCycleCountItem(data: CountCycleCountItemData): Promise<CycleCountWithItems>;
  approveCycleCount(data: ApproveCycleCountData): Promise<CycleCountApprovalResult>;
  cancelCycleCount(data: CancelCycleCountData): Promise<CycleCountWithItems>;
}
