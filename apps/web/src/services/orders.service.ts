import { httpClient } from './http-client'
import type {
  CreateOrderRequest,
  InternalOrderStatus,
  OrderMutationResponse,
  OrderTransitionRequest,
  PaginatedOrdersResponse,
} from '../types/orders.types'

export class OrdersService {
  private readonly baseUrl = '/orders'

  async listOrders(params?: {
    page?: number
    perPage?: number
    status?: InternalOrderStatus
  }): Promise<PaginatedOrdersResponse> {
    const { data } = await httpClient.get<PaginatedOrdersResponse>(this.baseUrl, { params })
    return data
  }

  async createOrder(payload: CreateOrderRequest): Promise<OrderMutationResponse> {
    const { data } = await httpClient.post<OrderMutationResponse>(this.baseUrl, payload)
    return data
  }

  async confirmOrder(id: string, payload: OrderTransitionRequest): Promise<OrderMutationResponse> {
    const { data } = await httpClient.post<OrderMutationResponse>(
      `${this.baseUrl}/${id}/confirm`,
      payload,
    )
    return data
  }

  async cancelOrder(id: string, payload: OrderTransitionRequest): Promise<OrderMutationResponse> {
    const { data } = await httpClient.post<OrderMutationResponse>(
      `${this.baseUrl}/${id}/cancel`,
      payload,
    )
    return data
  }

  async fulfillOrder(id: string, payload: OrderTransitionRequest): Promise<OrderMutationResponse> {
    const { data } = await httpClient.post<OrderMutationResponse>(
      `${this.baseUrl}/${id}/fulfill`,
      payload,
    )
    return data
  }
}

export const ordersService = new OrdersService()
