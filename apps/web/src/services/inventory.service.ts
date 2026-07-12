import { httpClient } from './http-client'
import type {
  CancelInventoryTransferRequest,
  CompleteInventoryTransferRequest,
  CreateInventoryTransferRequest,
  CreateWarehouseRequest,
  InventoryAdjustmentResponse,
  InventoryBalance,
  InventoryMovement,
  InventoryReservation,
  InventoryReservationOperationResponse,
  InventoryTransfer,
  InventoryTransferCompletionResponse,
  PaginatedResponse,
  RecordAdjustmentRequest,
  ReservationTransitionRequest,
  ReserveStockRequest,
  UpdateInventoryTransferRequest,
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

  async listReservations(
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<InventoryReservation>> {
    const { data } = await httpClient.get<PaginatedResponse<InventoryReservation>>(
      '/inventory/reservations',
      { params },
    )
    return data
  }

  async reserveStock(payload: ReserveStockRequest): Promise<InventoryReservationOperationResponse> {
    const { data } = await httpClient.post<InventoryReservationOperationResponse>(
      '/inventory/reservations',
      payload,
    )
    return data
  }

  async releaseReservation(
    id: string,
    payload: ReservationTransitionRequest,
  ): Promise<InventoryReservationOperationResponse> {
    const { data } = await httpClient.post<InventoryReservationOperationResponse>(
      `/inventory/reservations/${id}/release`,
      payload,
    )
    return data
  }

  async consumeReservation(
    id: string,
    payload: ReservationTransitionRequest,
  ): Promise<InventoryReservationOperationResponse> {
    const { data } = await httpClient.post<InventoryReservationOperationResponse>(
      `/inventory/reservations/${id}/consume`,
      payload,
    )
    return data
  }

  async listTransfers(
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<InventoryTransfer>> {
    const { data } = await httpClient.get<PaginatedResponse<InventoryTransfer>>(
      '/inventory/transfers',
      { params },
    )
    return data
  }

  async createTransfer(
    payload: CreateInventoryTransferRequest,
  ): Promise<{ transfer: InventoryTransfer }> {
    const { data } = await httpClient.post<{ transfer: InventoryTransfer }>(
      '/inventory/transfers',
      payload,
    )
    return data
  }

  async updateTransfer(
    id: string,
    payload: UpdateInventoryTransferRequest,
  ): Promise<{ transfer: InventoryTransfer }> {
    const { data } = await httpClient.patch<{ transfer: InventoryTransfer }>(
      `/inventory/transfers/${id}`,
      payload,
    )
    return data
  }

  async startTransfer(id: string): Promise<{ transfer: InventoryTransfer }> {
    const { data } = await httpClient.post<{ transfer: InventoryTransfer }>(
      `/inventory/transfers/${id}/start`,
    )
    return data
  }

  async completeTransfer(
    id: string,
    payload: CompleteInventoryTransferRequest,
  ): Promise<InventoryTransferCompletionResponse> {
    const { data } = await httpClient.post<InventoryTransferCompletionResponse>(
      `/inventory/transfers/${id}/complete`,
      payload,
    )
    return data
  }

  async cancelTransfer(
    id: string,
    payload: CancelInventoryTransferRequest,
  ): Promise<{ transfer: InventoryTransfer }> {
    const { data } = await httpClient.post<{ transfer: InventoryTransfer }>(
      `/inventory/transfers/${id}/cancel`,
      payload,
    )
    return data
  }
}

export const inventoryService = new InventoryService()
