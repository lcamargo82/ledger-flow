export type ProductType = 'SIMPLE' | 'PARENT' | 'VARIANT'
export type ProductStatus = 'ACTIVE' | 'ARCHIVED'

export interface ProductSku {
  id: string
  skuCanonical: string
  skuDisplay: string
  barcode?: string | null
  unitOfMeasure: string
  averageCost: string | number
  currency: string
}

export interface ProductListItem {
  id: string
  tenantId: string
  type: ProductType
  status: ProductStatus
  parentProductId?: string | null
  name: string
  description?: string | null
  brand?: string | null
  category?: string | null
  attributes?: Record<string, unknown> | null
  sku?: ProductSku | null
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface ProductSkuPayload {
  sku: string
  averageCost: number
  unitOfMeasure: string
  currency: string
  barcode?: string
}

export interface CreateProductRequest {
  type: ProductType
  parentProductId?: string
  name: string
  description?: string
  brand?: string
  category?: string
  sku?: ProductSkuPayload
}

export interface UpdateProductRequest {
  name?: string
  description?: string
  brand?: string
  category?: string
  sku?: ProductSkuPayload
  costChangeReason?: string
}

export interface ListProductsParams {
  page?: number
  perPage?: number
  search?: string
  type?: ProductType
  status?: ProductStatus
}

export interface PaginatedProductsMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface PaginatedProductsResponse {
  data: ProductListItem[]
  meta: PaginatedProductsMeta
}

export interface ProductDetailsResponse {
  product: ProductListItem
}

export interface ProductMutationResponse {
  product: ProductListItem
}
