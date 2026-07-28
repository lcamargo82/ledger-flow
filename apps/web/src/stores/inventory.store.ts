import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { inventoryService } from '../services/inventory.service'
import type {
  ApproveCycleCountRequest,
  CancelCycleCountRequest,
  CancelInventoryTransferRequest,
  CompleteInventoryTransferRequest,
  CountCycleCountItemRequest,
  CreateCycleCountRequest,
  CreateInventoryTransferRequest,
  CreateWarehouseRequest,
  CycleCount,
  InventoryBalance,
  InventoryValuationGroup,
  InventoryValuationGroupBy,
  InventoryValuationSummary,
  InventoryMovement,
  InventoryReservation,
  InventoryTransfer,
  PaginatedMeta,
  RecordAdjustmentRequest,
  ReservationTransitionRequest,
  ReserveStockRequest,
  UpdateWarehouseRequest,
  Warehouse,
} from '../types/inventory.types'

export const useInventoryStore = defineStore('inventory', () => {
  const warehouses = ref<Warehouse[]>([])
  const balances = ref<InventoryBalance[]>([])
  const valuationSummary = ref<InventoryValuationSummary>({
    onHandQuantity: '0',
    reservedQuantity: '0',
    availableQuantity: '0',
    totalValue: '0',
    reservedValue: '0',
    availableValue: '0',
    skuCount: 0,
    warehouseCount: 0,
    currency: 'BRL',
  })
  const valuationGroups = ref<InventoryValuationGroup[]>([])
  const valuationGroupBy = ref<InventoryValuationGroupBy>('SKU')
  const movements = ref<InventoryMovement[]>([])
  const reservations = ref<InventoryReservation[]>([])
  const transfers = ref<InventoryTransfer[]>([])
  const cycleCounts = ref<CycleCount[]>([])
  const warehouseMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const balanceMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const movementMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const reservationMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const transferMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const cycleCountMeta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const search = ref('')

  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)

  const activeWarehouses = computed(() =>
    warehouses.value.filter((warehouse) => warehouse.isActive),
  )

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) return 'inventory.errors.warehouseCodeExists'
      const message = err.response?.data?.message
      const normalizedMessage = Array.isArray(message) ? message.join(' ') : String(message || '')
      if (err.response?.status === 404 && normalizedMessage.includes('SKU not found')) {
        return 'inventory.errors.skuNotFound'
      }
      if (err.response?.status === 404) return 'inventory.errors.notFound'
      if (err.response?.status === 403) return 'inventory.errors.forbidden'
      if (
        err.response?.status === 400 &&
        normalizedMessage.includes('Insufficient on-hand quantity')
      ) {
        return 'inventory.errors.insufficientOnHand'
      }
      if (err.response?.status === 400) return 'inventory.errors.invalid'
    }
    return 'inventory.errors.default'
  }

  const clearError = () => {
    error.value = null
  }

  const fetchWarehouses = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await inventoryService.listWarehouses({
        page: warehouseMeta.value.page,
        perPage: warehouseMeta.value.perPage,
        search: search.value || undefined,
      })
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
    const response = await inventoryService.listBalances({
      page: balanceMeta.value.page,
      perPage: balanceMeta.value.perPage,
      search: search.value || undefined,
    })
    balances.value = response.data
    balanceMeta.value = response.meta
  }

  const fetchValuation = async () => {
    const response = await inventoryService.getValuation({
      groupBy: valuationGroupBy.value,
      search: search.value || undefined,
    })
    valuationSummary.value = response.summary
    valuationGroups.value = response.groups
  }

  const fetchMovements = async () => {
    const response = await inventoryService.listMovements({
      page: movementMeta.value.page,
      perPage: movementMeta.value.perPage,
      search: search.value || undefined,
    })
    movements.value = response.data
    movementMeta.value = response.meta
  }

  const fetchReservations = async () => {
    const response = await inventoryService.listReservations({
      page: reservationMeta.value.page,
      perPage: reservationMeta.value.perPage,
      search: search.value || undefined,
    })
    reservations.value = response.data
    reservationMeta.value = response.meta
  }

  const fetchTransfers = async () => {
    const response = await inventoryService.listTransfers({
      page: transferMeta.value.page,
      perPage: transferMeta.value.perPage,
      search: search.value || undefined,
    })
    transfers.value = response.data
    transferMeta.value = response.meta
  }

  const fetchCycleCounts = async () => {
    const response = await inventoryService.listCycleCounts({
      page: cycleCountMeta.value.page,
      perPage: cycleCountMeta.value.perPage,
      search: search.value || undefined,
    })
    cycleCounts.value = response.data
    cycleCountMeta.value = response.meta
  }

  const fetchInventory = async () => {
    isLoading.value = true
    error.value = null
    try {
      await Promise.all([
        fetchWarehouses(),
        fetchBalances(),
        fetchValuation(),
        fetchMovements(),
        fetchReservations(),
      ])
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const setWarehousePage = (page: number) => {
    warehouseMeta.value.page = page
    fetchWarehouses()
  }

  const setBalancePage = (page: number) => {
    balanceMeta.value.page = page
    fetchBalances()
  }

  const setValuationGroupBy = (groupBy: InventoryValuationGroupBy) => {
    valuationGroupBy.value = groupBy
    fetchValuation()
  }

  const setMovementPage = (page: number) => {
    movementMeta.value.page = page
    fetchMovements()
  }

  const setReservationPage = (page: number) => {
    reservationMeta.value.page = page
    fetchReservations()
  }

  const setTransferPage = (page: number) => {
    transferMeta.value.page = page
    fetchTransfers()
  }

  const setCycleCountPage = (page: number) => {
    cycleCountMeta.value.page = page
    fetchCycleCounts()
  }

  const setSearch = (value: string) => {
    search.value = value
    warehouseMeta.value.page = 1
    balanceMeta.value.page = 1
    movementMeta.value.page = 1
    reservationMeta.value.page = 1
    transferMeta.value.page = 1
    cycleCountMeta.value.page = 1
    fetchInventory()
  }

  const setTransferSearch = (value: string) => {
    search.value = value
    transferMeta.value.page = 1
    fetchTransfers()
  }

  const setCycleCountSearch = (value: string) => {
    search.value = value
    cycleCountMeta.value.page = 1
    fetchCycleCounts()
  }

  const createWarehouse = async (payload: CreateWarehouseRequest) => {
    isMutating.value = true
    try {
      const response = await inventoryService.createWarehouse(payload)
      await fetchWarehouses()
      return response.warehouse
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
      await Promise.all([fetchBalances(), fetchValuation(), fetchMovements()])
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const reserveStock = async (payload: ReserveStockRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.reserveStock(payload)
      await Promise.all([fetchBalances(), fetchValuation(), fetchMovements(), fetchReservations()])
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const releaseReservation = async (id: string, payload: ReservationTransitionRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.releaseReservation(id, payload)
      await Promise.all([fetchBalances(), fetchValuation(), fetchMovements(), fetchReservations()])
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const consumeReservation = async (id: string, payload: ReservationTransitionRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.consumeReservation(id, payload)
      await Promise.all([fetchBalances(), fetchValuation(), fetchMovements(), fetchReservations()])
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const createTransfer = async (payload: CreateInventoryTransferRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.createTransfer(payload)
      await fetchTransfers()
      return response.transfer
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const startTransfer = async (id: string) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.startTransfer(id)
      await fetchTransfers()
      return response.transfer
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const completeTransfer = async (id: string, payload: CompleteInventoryTransferRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.completeTransfer(id, payload)
      await Promise.all([fetchTransfers(), fetchBalances(), fetchValuation(), fetchMovements()])
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const cancelTransfer = async (id: string, payload: CancelInventoryTransferRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.cancelTransfer(id, payload)
      await fetchTransfers()
      return response.transfer
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const createCycleCount = async (payload: CreateCycleCountRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.createCycleCount(payload)
      await fetchCycleCounts()
      return response.cycleCount
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const openCycleCount = async (id: string) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.openCycleCount(id)
      await fetchCycleCounts()
      return response.cycleCount
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const countCycleCountItem = async (
    id: string,
    itemId: string,
    payload: CountCycleCountItemRequest,
  ) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.countCycleCountItem(id, itemId, payload)
      await fetchCycleCounts()
      return response.cycleCount
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const approveCycleCount = async (id: string, payload: ApproveCycleCountRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.approveCycleCount(id, payload)
      await Promise.all([fetchCycleCounts(), fetchBalances(), fetchValuation(), fetchMovements()])
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const cancelCycleCount = async (id: string, payload: CancelCycleCountRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await inventoryService.cancelCycleCount(id, payload)
      await fetchCycleCounts()
      return response.cycleCount
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
    valuationSummary,
    valuationGroups,
    valuationGroupBy,
    movements,
    reservations,
    transfers,
    cycleCounts,
    warehouseMeta,
    balanceMeta,
    movementMeta,
    reservationMeta,
    transferMeta,
    cycleCountMeta,
    search,
    activeWarehouses,
    isLoading,
    isMutating,
    error,
    clearError,
    fetchInventory,
    fetchWarehouses,
    fetchBalances,
    fetchValuation,
    fetchMovements,
    fetchReservations,
    fetchTransfers,
    fetchCycleCounts,
    setWarehousePage,
    setBalancePage,
    setValuationGroupBy,
    setMovementPage,
    setReservationPage,
    setTransferPage,
    setCycleCountPage,
    setSearch,
    setTransferSearch,
    setCycleCountSearch,
    createWarehouse,
    updateWarehouse,
    recordAdjustment,
    reserveStock,
    releaseReservation,
    consumeReservation,
    createTransfer,
    startTransfer,
    completeTransfer,
    cancelTransfer,
    createCycleCount,
    openCycleCount,
    countCycleCountItem,
    approveCycleCount,
    cancelCycleCount,
  }
})
