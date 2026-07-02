import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { catalogProductsService } from '../services/catalog-products.service'
import type {
  CreateProductRequest,
  ListProductsParams,
  PaginatedProductsMeta,
  ProductListItem,
  ProductStatus,
  ProductType,
  UpdateProductRequest,
} from '../types/catalog.types'

export const useCatalogProductsStore = defineStore('catalogProducts', () => {
  const products = ref<ProductListItem[]>([])
  const selectedProduct = ref<ProductListItem | null>(null)
  const meta = ref<PaginatedProductsMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const filters = ref<ListProductsParams>({ page: 1, perPage: 10, search: '' })

  const isLoading = ref(false)
  const isLoadingDetails = ref(false)
  const isCreating = ref(false)
  const isUpdating = ref(false)
  const isArchiving = ref(false)
  const error = ref<string | null>(null)

  const totalPages = computed(() => meta.value.totalPages)
  const currentPage = computed(() => meta.value.page)

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) return 'catalog.errors.skuAlreadyExists'
      if (err.response?.status === 404) return 'catalog.errors.notFound'
      if (err.response?.status === 403) return 'catalog.errors.forbidden'
      if (err.response?.status === 400) return 'catalog.errors.invalid'
    }
    return 'catalog.errors.default'
  }

  const fetchProducts = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await catalogProductsService.listProducts(filters.value)
      products.value = response.data
      meta.value = response.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchProductById = async (id: string) => {
    isLoadingDetails.value = true
    error.value = null
    try {
      const response = await catalogProductsService.getProductById(id)
      selectedProduct.value = response.product
      return response.product
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoadingDetails.value = false
    }
  }

  const createProduct = async (payload: CreateProductRequest) => {
    isCreating.value = true
    error.value = null
    try {
      const response = await catalogProductsService.createProduct(payload)
      await fetchProducts()
      return response.product
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isCreating.value = false
    }
  }

  const updateProduct = async (id: string, payload: UpdateProductRequest) => {
    isUpdating.value = true
    error.value = null
    try {
      const response = await catalogProductsService.updateProduct(id, payload)
      await fetchProducts()
      selectedProduct.value = response.product
      return response.product
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  const archiveProduct = async (id: string) => {
    isArchiving.value = true
    error.value = null
    try {
      const response = await catalogProductsService.archiveProduct(id)
      await fetchProducts()
      return response.product
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isArchiving.value = false
    }
  }

  const setPage = (page: number) => {
    filters.value.page = page
    fetchProducts()
  }

  const setSearch = (search: string) => {
    filters.value.search = search
    filters.value.page = 1
    fetchProducts()
  }

  const setType = (type?: ProductType) => {
    filters.value.type = type
    filters.value.page = 1
    fetchProducts()
  }

  const setStatus = (status?: ProductStatus) => {
    filters.value.status = status
    filters.value.page = 1
    fetchProducts()
  }

  const resetFilters = () => {
    filters.value = { page: 1, perPage: 10, search: '' }
    fetchProducts()
  }

  return {
    products,
    selectedProduct,
    meta,
    filters,
    isLoading,
    isLoadingDetails,
    isCreating,
    isUpdating,
    isArchiving,
    error,
    totalPages,
    currentPage,
    fetchProducts,
    fetchProductById,
    createProduct,
    updateProduct,
    archiveProduct,
    setPage,
    setSearch,
    setType,
    setStatus,
    resetFilters,
  }
})
