import { Product, ProductSku, ProductStatus, ProductType } from '@prisma/client';

export type ProductWithSku = Product & { sku: ProductSku | null };

export interface ProductSkuCreateData {
  skuCanonical: string;
  skuDisplay: string;
  averageCost: number;
  unitOfMeasure: string;
  currency: string;
  barcode?: string | null;
}

export interface ProductCreateData {
  tenantId: string;
  type: ProductType;
  parentProductId?: string | null;
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  attributes?: Record<string, unknown> | null;
  sku?: ProductSkuCreateData;
}

export interface ProductUpdateData {
  name?: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  attributes?: Record<string, unknown> | null;
  sku?: Partial<ProductSkuCreateData>;
}

export interface ListProductsParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  search?: string;
  type?: ProductType;
  status?: ProductStatus;
}

export interface PaginatedProductsResult {
  data: ProductWithSku[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export const CATALOG_PRODUCTS_REPOSITORY = Symbol('CATALOG_PRODUCTS_REPOSITORY');

export interface CatalogProductsRepository {
  findPaginated(params: ListProductsParams): Promise<PaginatedProductsResult>;
  findByIdAndTenant(id: string, tenantId: string): Promise<ProductWithSku | null>;
  findSkuByCanonicalAndTenant(skuCanonical: string, tenantId: string): Promise<ProductSku | null>;
  create(data: ProductCreateData): Promise<ProductWithSku>;
  update(id: string, tenantId: string, data: ProductUpdateData): Promise<ProductWithSku>;
  archive(id: string, tenantId: string): Promise<ProductWithSku>;
}
