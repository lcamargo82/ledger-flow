<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useDebounceFn } from '../composables/useDebounce'
import { useAuthStore } from '../stores/auth.store'
import { useCatalogProductsStore } from '../stores/catalog-products.store'
import { formatDateTime } from '../utils/date-format'
import type { ProductListItem, ProductStatus, ProductType } from '../types/catalog.types'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'
import AppModal from '../components/common/AppModal.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'
import ProductForm from '../components/catalog/ProductForm.vue'

const { t, currentLocale } = useI18n()
const authStore = useAuthStore()
const catalogStore = useCatalogProductsStore()

const searchInput = ref(catalogStore.filters.search || '')
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const targetProduct = ref<ProductListItem | null>(null)

const columns = computed(() => [
  { key: 'name', label: t('catalog.table.name') },
  { key: 'sku', label: t('catalog.table.sku') },
  { key: 'type', label: t('catalog.table.type') },
  { key: 'cost', label: t('catalog.table.cost') },
  { key: 'status', label: t('catalog.table.status') },
  { key: 'createdAt', label: t('catalog.table.createdAt') },
  { key: 'actions', label: t('catalog.table.actions'), align: 'right' as const },
])

const typeOptions = computed(() => [
  { value: '', label: t('catalog.filters.typeAll') },
  { value: 'SIMPLE', label: t('catalog.type.SIMPLE') },
  { value: 'PARENT', label: t('catalog.type.PARENT') },
  { value: 'VARIANT', label: t('catalog.type.VARIANT') },
])

const statusOptions = computed(() => [
  { value: '', label: t('catalog.filters.statusAll') },
  { value: 'ACTIVE', label: t('catalog.status.ACTIVE') },
  { value: 'ARCHIVED', label: t('catalog.status.ARCHIVED') },
])

onMounted(() => {
  catalogStore.fetchProducts()
})

const handleSearch = useDebounceFn(() => {
  catalogStore.setSearch(searchInput.value)
}, 500)

const clearFilters = () => {
  searchInput.value = ''
  catalogStore.resetFilters()
}

const openEditModal = async (product: ProductListItem) => {
  await catalogStore.fetchProductById(product.id)
  targetProduct.value = catalogStore.selectedProduct
  isEditModalOpen.value = true
}

const handleCreateProduct = async (payload: any) => {
  await catalogStore.createProduct(payload)
  isCreateModalOpen.value = false
}

const handleUpdateProduct = async (payload: any) => {
  if (!targetProduct.value) return
  await catalogStore.updateProduct(targetProduct.value.id, payload)
  isEditModalOpen.value = false
}

const archiveProduct = async (product: ProductListItem) => {
  await catalogStore.archiveProduct(product.id)
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader :title="t('catalog.title')" :description="t('catalog.description')">
      <template #actions>
        <AppButton
          v-if="authStore.checkAllPermissions(['catalog:manage'])"
          variant="primary"
          @click="isCreateModalOpen = true"
        >
          {{ t('catalog.actions.create') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppErrorState
      v-if="catalogStore.error && !catalogStore.products.length"
      :title="t('catalog.errors.title')"
      :description="t(catalogStore.error)"
      @retry="catalogStore.fetchProducts()"
    />

    <template v-else>
      <AppCard>
        <div class="filters-row">
          <div class="filter-item filter-item--large">
            <AppInput
              id="catalog-search"
              v-model="searchInput"
              :label="t('catalog.filters.searchLabel')"
              :placeholder="t('catalog.filters.searchPlaceholder')"
              @input="handleSearch"
            />
          </div>
          <div class="filter-item">
            <AppSelect
              id="catalog-type"
              :model-value="catalogStore.filters.type || ''"
              :label="t('catalog.filters.typeLabel')"
              :options="typeOptions"
              @update:model-value="catalogStore.setType(($event || undefined) as ProductType | undefined)"
            />
          </div>
          <div class="filter-item">
            <AppSelect
              id="catalog-status"
              :model-value="catalogStore.filters.status || ''"
              :label="t('catalog.filters.statusLabel')"
              :options="statusOptions"
              @update:model-value="catalogStore.setStatus(($event || undefined) as ProductStatus | undefined)"
            />
          </div>
          <div class="filter-item-actions">
            <AppButton variant="secondary" @click="clearFilters">
              {{ t('catalog.actions.clearFilters') }}
            </AppButton>
          </div>
        </div>
      </AppCard>

      <AppTable
        :columns="columns"
        :items="catalogStore.products"
        :is-loading="catalogStore.isLoading"
        :empty-title="t('catalog.empty.title')"
        :empty-description="t('catalog.empty.description')"
      >
        <template #name="{ item }">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ item.brand || item.category || '-' }}</p>
          </div>
        </template>

        <template #sku="{ item }">
          <span class="font-mono text-sm">{{ item.sku?.skuDisplay || '-' }}</span>
        </template>

        <template #type="{ item }">
          <AppBadge variant="info">{{ t(`catalog.type.${item.type}`) }}</AppBadge>
        </template>

        <template #cost="{ item }">
          <span>{{ item.sku ? `${item.sku.currency} ${item.sku.averageCost}` : '-' }}</span>
        </template>

        <template #status="{ item }">
          <AppBadge :variant="item.status === 'ACTIVE' ? 'success' : 'default'">
            {{ t(`catalog.status.${item.status}`) }}
          </AppBadge>
        </template>

        <template #createdAt="{ item }">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDateTime(item.createdAt, currentLocale) }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="flex justify-end gap-2">
            <AppButton
              v-if="authStore.checkAllPermissions(['catalog:manage']) && item.status === 'ACTIVE'"
              variant="secondary"
              size="small"
              @click="openEditModal(item)"
            >
              {{ t('catalog.actions.edit') }}
            </AppButton>
            <AppButton
              v-if="authStore.checkAllPermissions(['catalog:manage']) && item.status === 'ACTIVE'"
              variant="danger"
              size="small"
              @click="archiveProduct(item)"
            >
              {{ t('catalog.actions.archive') }}
            </AppButton>
          </div>
        </template>
      </AppTable>

      <div v-if="catalogStore.totalPages > 1" class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          {{ t('catalog.pagination.pageOf', { page: catalogStore.currentPage, totalPages: catalogStore.totalPages }) }}
        </div>
        <div class="flex gap-2">
          <AppButton
            variant="secondary"
            size="small"
            :disabled="catalogStore.currentPage <= 1 || catalogStore.isLoading"
            @click="catalogStore.setPage(catalogStore.currentPage - 1)"
          >
            {{ t('catalog.pagination.previous') }}
          </AppButton>
          <AppButton
            variant="secondary"
            size="small"
            :disabled="catalogStore.currentPage >= catalogStore.totalPages || catalogStore.isLoading"
            @click="catalogStore.setPage(catalogStore.currentPage + 1)"
          >
            {{ t('catalog.pagination.next') }}
          </AppButton>
        </div>
      </div>
    </template>

    <AppModal v-model="isCreateModalOpen" :title="t('catalog.form.createTitle')" size="lg">
      <ProductForm
        mode="create"
        :parent-options="catalogStore.products"
        :loading="catalogStore.isCreating"
        @submit="handleCreateProduct"
        @cancel="isCreateModalOpen = false"
      />
    </AppModal>

    <AppModal v-model="isEditModalOpen" :title="t('catalog.form.editTitle')" size="lg">
      <ProductForm
        mode="edit"
        :product="targetProduct"
        :parent-options="catalogStore.products"
        :loading="catalogStore.isUpdating"
        @submit="handleUpdateProduct"
        @cancel="isEditModalOpen = false"
      />
    </AppModal>
  </div>
</template>
