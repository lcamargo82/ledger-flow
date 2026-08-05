import {
  InventoryReservation,
  InternalOrder,
  InternalOrderItem,
  InternalOrderStatus,
  OrderShippingSummary,
  ProductSku,
  Warehouse,
} from '@prisma/client';

export type InternalOrderItemWithReservation = InternalOrderItem & {
  sku?: Pick<ProductSku, 'skuDisplay'> & { product: { name: string } };
  warehouse?: Pick<Warehouse, 'name' | 'code'>;
  reservation?: Pick<InventoryReservation, 'id' | 'status'> | null;
};

export type InternalOrderWithItems = InternalOrder & {
  items: InternalOrderItemWithReservation[];
  shippingSummaries: OrderShippingSummary[];
};

export interface PaginatedOrdersResult {
  data: InternalOrderWithItems[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateOrderData {
  tenantId: string;
  idempotencyKey: string;
  customerName?: string | null;
  notes?: string | null;
  createdByUserId: string;
  items: Array<{
    skuId: string;
    warehouseId: string;
    quantity: number;
  }>;
}

export interface ListOrdersParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  status?: InternalOrderStatus;
}

export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');

export interface OrdersRepository {
  findById(id: string, tenantId: string): Promise<InternalOrderWithItems | null>;
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<InternalOrderWithItems | null>;
  create(data: CreateOrderData): Promise<InternalOrderWithItems>;
  updateStatus(
    id: string,
    tenantId: string,
    status: InternalOrderStatus,
  ): Promise<InternalOrderWithItems>;
  setItemReservation(itemId: string, tenantId: string, reservationId: string): Promise<void>;
  listPaginated(params: ListOrdersParams): Promise<PaginatedOrdersResult>;
}
