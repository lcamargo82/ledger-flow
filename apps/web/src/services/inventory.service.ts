import { httpClient } from './http-client'
import type {
  CreateWarehouseRequest,
  InventoryAdjustmentResponse,
  InventoryBalance,
  InventoryMovement,
  PaginatedResponse,
  RecordAdjustmentRequest,
  UpdateWarehouseRequest,
  Warehouse,
} from '../types/inventory.types'

export class InventoryService {
  async listWarehouses(params?: Record<string, unknown>): Promise<PaginatedResponse<Warehouse>> {
    const { data } = await httpClient.get<PaginatedResponse<Warehouse>>('/inventory/warehouses', {
      params,
    })
    return data
  }

  async createWarehouse(payload: CreateWarehouseRequest): Promise<{ warehouse: Warehouse }> {
    const { data } = await httpClient.post<{ warehouse: Warehouse }>(
      '/inventory/warehouses',
      payload,
    )
    return data
  }

  async updateWarehouse(
    id: string,
    payload: UpdateWarehouseRequest,
  ): Promise<{ warehouse: Warehouse }> {
    const { data } = await httpClient.patch<{ warehouse: Warehouse }>(
      `/inventory/warehouses/${id}`,
      payload,
    )
    return data
  }

  async listBalances(
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<InventoryBalance>> {
    const { data } = await httpClient.get<PaginatedResponse<InventoryBalance>>(
      '/inventory/balances',
      { params },
    )
    return data
  }

  async listMovements(
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<InventoryMovement>> {
    const { data } = await httpClient.get<PaginatedResponse<InventoryMovement>>(
      '/inventory/movements',
      { params },
    )
    return data
  }

  async recordAdjustment(payload: RecordAdjustmentRequest): Promise<InventoryAdjustmentResponse> {
    const { data } = await httpClient.post<InventoryAdjustmentResponse>(
      '/inventory/movements/adjustments',
      payload,
    )
    return data
  }
}

export const inventoryService = new InventoryService()
