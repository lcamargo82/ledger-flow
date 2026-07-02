import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { inventoryService } from '../services/inventory.service'
import type {
  CreateWarehouseRequest,
  InventoryBalance,
  InventoryMovement,
  PaginatedMeta,
  RecordAdjustmentRequest,
  UpdateWarehouseRequest,
  Warehouse,
} from '../types/inventory.types'

export const useInventoryStore = defineStore('inventory', () => {
  const warehouses = ref<Warehouse[]>([])
  const balances = ref<InventoryBalance[]>([])
  const movements = ref<InventoryMovement[]>([])
  const warehouseMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const balanceMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const movementMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })

  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)

  const activeWarehouses = computed(() =>
    warehouses.value.filter((warehouse) => warehouse.isActive),
  )

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) return 'inventory.errors.warehouseCodeExists'
      if (err.response?.status === 404) return 'inventory.errors.notFound'
      if (err.response?.status === 403) return 'inventory.errors.forbidden'
      if (err.response?.status === 400) return 'inventory.errors.invalid'
    }
    return 'inventory.errors.default'
  }

  const fetchWarehouses = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await inventoryService.listWarehouses()
      warehouses.value = response.data
      warehouseMeta.value = response.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchBalances = async () => {
    const response = await inventoryService.listBalances()
    balances.value = response.data
    balanceMeta.value = response.meta
  }

  const fetchMovements = async () => {
    const response = await inventoryService.listMovements()
    movements.value = response.data
    movementMeta.value = response.meta
  }

  const fetchInventory = async () => {
    isLoading.value = true
    error.value = null
    try {
      await Promise.all([fetchWarehouses(), fetchBalances(), fetchMovements()])
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createWarehouse = async (payload: CreateWarehouseRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.createWarehouse(payload)
      await fetchWarehouses()
      return response.warehouse
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const updateWarehouse = async (id: string, payload: UpdateWarehouseRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.updateWarehouse(id, payload)
      await fetchWarehouses()
      return response.warehouse
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const recordAdjustment = async (payload: RecordAdjustmentRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.recordAdjustment(payload)
      await Promise.all([fetchBalances(), fetchMovements()])
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  return {
    warehouses,
    balances,
    movements,
    warehouseMeta,
    balanceMeta,
    movementMeta,
    activeWarehouses,
    isLoading,
    isMutating,
    error,
    fetchInventory,
    fetchWarehouses,
    fetchBalances,
    fetchMovements,
    createWarehouse,
    updateWarehouse,
    recordAdjustment,
  }
})
