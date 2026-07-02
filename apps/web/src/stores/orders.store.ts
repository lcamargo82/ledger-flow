import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { ordersService } from '../services/orders.service'
import type {
  CreateOrderRequest,
  InternalOrder,
  InternalOrderStatus,
  OrderTransitionRequest,
  OrdersMeta,
} from '../types/orders.types'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<InternalOrder[]>([])
  const meta = ref<OrdersMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const filters = ref<{ page: number; perPage: number; status?: InternalOrderStatus }>({
    page: 1,
    perPage: 10,
  })
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)

  const totalPages = computed(() => meta.value.totalPages)
  const currentPage = computed(() => meta.value.page)

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) return 'orders.errors.notFound'
      if (err.response?.status === 403) return 'orders.errors.forbidden'
      if (err.response?.status === 400) return 'orders.errors.invalid'
    }
    return 'orders.errors.default'
  }

  const fetchOrders = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await ordersService.listOrders(filters.value)
      orders.value = response.data
      meta.value = response.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createOrder = async (payload: CreateOrderRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await ordersService.createOrder(payload)
      await fetchOrders()
      return response.order
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const transitionOrder = async (
    id: string,
    action: 'confirm' | 'cancel' | 'fulfill',
    payload: OrderTransitionRequest,
  ) => {
    isMutating.value = true
    error.value = null
    try {
      const response =
        action === 'confirm'
          ? await ordersService.confirmOrder(id, payload)
          : action === 'cancel'
            ? await ordersService.cancelOrder(id, payload)
            : await ordersService.fulfillOrder(id, payload)
      await fetchOrders()
      return response.order
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const setStatus = (status?: InternalOrderStatus) => {
    filters.value.status = status
    filters.value.page = 1
    fetchOrders()
  }

  const setPage = (page: number) => {
    filters.value.page = page
    fetchOrders()
  }

  return {
    orders,
    meta,
    filters,
    isLoading,
    isMutating,
    error,
    totalPages,
    currentPage,
    fetchOrders,
    createOrder,
    transitionOrder,
    setStatus,
    setPage,
  }
})
