import { httpClient } from './http-client'
import type {
  CreateProductRequest,
  ListProductsParams,
  PaginatedProductsResponse,
  ProductDetailsResponse,
  ProductMutationResponse,
  UpdateProductRequest,
} from '../types/catalog.types'

export class CatalogProductsService {
  private readonly baseUrl = '/catalog/products'

  async listProducts(params?: ListProductsParams): Promise<PaginatedProductsResponse> {
    const { data } = await httpClient.get<PaginatedProductsResponse>(this.baseUrl, { params })
    return data
  }

  async getProductById(id: string): Promise<ProductDetailsResponse> {
    const { data } = await httpClient.get<ProductDetailsResponse>(`${this.baseUrl}/${id}`)
    return data
  }

  async createProduct(payload: CreateProductRequest): Promise<ProductMutationResponse> {
    const { data } = await httpClient.post<ProductMutationResponse>(this.baseUrl, payload)
    return data
  }

  async updateProduct(id: string, payload: UpdateProductRequest): Promise<ProductMutationResponse> {
    const { data } = await httpClient.patch<ProductMutationResponse>(`${this.baseUrl}/${id}`, payload)
    return data
  }

  async archiveProduct(id: string): Promise<ProductMutationResponse> {
    const { data } = await httpClient.post<ProductMutationResponse>(`${this.baseUrl}/${id}/archive`)
    return data
  }
}

export const catalogProductsService = new CatalogProductsService()
