<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useDebounceFn } from '../composables/useDebounce'
import { useAuthStore } from '../stores/auth.store'
import { useCatalogProductsStore } from '../stores/catalog-products.store'
import { useInventoryStore } from '../stores/inventory.store'
import { useToastStore } from '../stores/toast.store'
import { formatDateTime } from '../utils/date-format'
import { formatMoney } from '../utils/money-format'
import type { ProductListItem, ProductStatus, ProductType } from '../types/catalog.types'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'
import AppModal from '../components/common/AppModal.vue'
import AppNumberInput from '../components/common/AppNumberInput.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'
import ProductForm from '../components/catalog/ProductForm.vue'

const { t, currentLocale } = useI18n()
const authStore = useAuthStore()
const catalogStore = useCatalogProductsStore()
const inventoryStore = useInventoryStore()
const toast = useToastStore()

const searchInput = ref(catalogStore.filters.search || '')
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isStockPromptOpen = ref(false)
const isAdjustmentModalOpen = ref(false)
const targetProduct = ref<ProductListItem | null>(null)
const createdProductForStock = ref<ProductListItem | null>(null)
const formErrors = ref<Record<string, string>>({})
const adjustmentSubmitError = ref('')

const adjustmentForm = reactive({
  skuId: '',
  warehouseId: '',
  type: 'ADJUSTMENT_IN' as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT',
  quantity: null as number | null,
  reasonCode: '',
  notes: '',
})

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
  { value: '', label: t('catalog.filters.statusActive') },
  { value: 'ARCHIVED', label: t('catalog.status.ARCHIVED') },
])

const warehouseOptions = computed(() => [
  { value: '', label: t('inventory.form.warehousePlaceholder') },
  ...inventoryStore.activeWarehouses.map((warehouse) => ({
    value: warehouse.id,
    label: `${warehouse.code} - ${warehouse.name}`,
  })),
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

const openCreateModal = () => {
  formErrors.value = {}
  isCreateModalOpen.value = true
}

const openEditModal = (product: ProductListItem) => {
  targetProduct.value = { ...product }
  formErrors.value = {}
  isEditModalOpen.value = true
}

const catalogErrorMessage = (err: any) => {
  const msg = err.response?.data?.message || err.message
  const errorMessage = Array.isArray(msg) ? msg.join(', ') : String(msg || '')

  if (errorMessage.includes('Invalid SKU')) return t('catalog.errors.invalidSku')
  if (errorMessage.includes('SKU already exists')) return t('catalog.errors.skuAlreadyExists')
  if (errorMessage.includes('Cost change reason is required')) {
    return t('catalog.errors.costChangeReasonRequired')
  }

  return errorMessage || t('catalog.errors.default')
}

const handleCreateProduct = async (payload: any) => {
  formErrors.value = {}
  try {
    const product = await catalogStore.createProduct(payload)
    isCreateModalOpen.value = false
    if (product.sku && authStore.checkAllPermissions(['inventory:adjust'])) {
      createdProductForStock.value = product
      isStockPromptOpen.value = true
    }
    toast.success(t('catalog.toast.created') || 'Produto criado com sucesso!')
  } catch (err: any) {
    const errorMessage = catalogErrorMessage(err)
    if (errorMessage === t('catalog.errors.invalidSku')) {
      formErrors.value = { sku: errorMessage }
    }
    toast.error(errorMessage)
  }
}

const handleUpdateProduct = async (payload: any) => {
  if (!targetProduct.value) return
  formErrors.value = {}
  try {
    await catalogStore.updateProduct(targetProduct.value.id, payload)
    isEditModalOpen.value = false
    toast.success(t('catalog.toast.updated') || 'Produto atualizado com sucesso!')
  } catch (err: any) {
    const errorMessage = catalogErrorMessage(err)
    
    if (errorMessage === t('catalog.errors.costChangeReasonRequired')) {
      formErrors.value = { costChangeReason: t('catalog.errors.costChangeReasonRequired') || 'O motivo da alteração de custo é obrigatório.' }
    } else if (errorMessage === t('catalog.errors.invalidSku')) {
      formErrors.value = { sku: errorMessage }
    } else {
      toast.error(errorMessage)
    }
  }
}

const archiveProduct = async (product: ProductListItem) => {
  await catalogStore.archiveProduct(product.id)
}

const unarchiveProduct = async (product: ProductListItem) => {
  await catalogStore.unarchiveProduct(product.id)
  toast.success(t('catalog.toast.unarchived'))
}

const openInitialStockAdjustment = async () => {
  if (!createdProductForStock.value?.sku) return
  adjustmentSubmitError.value = ''
  adjustmentForm.skuId = createdProductForStock.value.sku.skuDisplay
  adjustmentForm.warehouseId = ''
  adjustmentForm.type = 'ADJUSTMENT_IN'
  adjustmentForm.quantity = null
  adjustmentForm.reasonCode = 'INITIAL_STOCK'
  adjustmentForm.notes = ''
  await inventoryStore.fetchWarehouses()
  isStockPromptOpen.value = false
  isAdjustmentModalOpen.value = true
}

const skipInitialStockAdjustment = () => {
  createdProductForStock.value = null
  isStockPromptOpen.value = false
}

const recordAdjustment = async () => {
  adjustmentSubmitError.value = ''

  try {
    await inventoryStore.recordAdjustment({
      skuId: adjustmentForm.skuId.trim(),
      warehouseId: adjustmentForm.warehouseId,
      type: adjustmentForm.type,
      quantity: Number(adjustmentForm.quantity),
      reasonCode: adjustmentForm.reasonCode,
      notes: adjustmentForm.notes || undefined,
    })
    isAdjustmentModalOpen.value = false
    createdProductForStock.value = null
    adjustmentForm.skuId = ''
    adjustmentForm.warehouseId = ''
    adjustmentForm.quantity = null
    adjustmentForm.reasonCode = ''
    adjustmentForm.notes = ''
    toast.success(t('catalog.toast.stockAdjusted'))
  } catch {
    adjustmentSubmitError.value = inventoryStore.error || 'inventory.errors.default'
    inventoryStore.clearError()
  }
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
        <div class="lf-filter-container">
          <div class="lf-filter-item lf-filter-item--large">
            <AppInput
              id="catalog-search"
              v-model="searchInput"
              :label="t('catalog.filters.searchLabel')"
              :placeholder="t('catalog.filters.searchPlaceholder')"
              @input="handleSearch"
            />
          </div>
          <div class="lf-filter-item">
            <AppSelect
              id="catalog-type"
              :model-value="catalogStore.filters.type || ''"
              :label="t('catalog.filters.typeLabel')"
              :options="typeOptions"
              @update:model-value="catalogStore.setType(($event || undefined) as ProductType | undefined)"
            />
          </div>
          <div class="lf-filter-item">
            <AppSelect
              id="catalog-status"
              :model-value="catalogStore.filters.status || ''"
              :label="t('catalog.filters.statusLabel')"
              :options="statusOptions"
              @update:model-value="catalogStore.setStatus(($event || undefined) as ProductStatus | undefined)"
            />
          </div>
          <div class="lf-filter-actions">
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
        :pagination="catalogStore.meta"
        @update:page="catalogStore.setPage"
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
          <span>{{ item.sku ? formatMoney(item.sku.averageCost, item.sku.currency, currentLocale) : '-' }}</span>
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
              icon-only
              :title="t('catalog.actions.edit')"
              @click="openEditModal(item)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </template>
            </AppButton>
            <AppButton
              v-if="authStore.checkAllPermissions(['catalog:manage']) && item.status === 'ACTIVE'"
              variant="danger"
              size="small"
              icon-only
              :title="t('catalog.actions.archive')"
              @click="archiveProduct(item)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">archive</span>
              </template>
            </AppButton>
            <AppButton
              v-if="authStore.checkAllPermissions(['catalog:manage']) && item.status === 'ARCHIVED'"
              variant="secondary"
              size="small"
              icon-only
              :title="t('catalog.actions.unarchive')"
              @click="unarchiveProduct(item)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">unarchive</span>
              </template>
            </AppButton>
          </div>
        </template>
      </AppTable>

    </template>

    <AppModal v-model="isCreateModalOpen" :title="t('catalog.form.createTitle')" size="lg">
      <ProductForm
        mode="create"
        :parent-options="catalogStore.products"
        :loading="catalogStore.isCreating"
        :errors="formErrors"
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
        :errors="formErrors"
        @submit="handleUpdateProduct"
        @cancel="isEditModalOpen = false"
      />
    </AppModal>

    <AppModal v-model="isStockPromptOpen" :title="t('catalog.stockPrompt.title')" size="md">
      <div class="space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{
            t('catalog.stockPrompt.description', {
              sku: createdProductForStock?.sku?.skuDisplay || '',
            })
          }}
        </p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="skipInitialStockAdjustment">
            {{ t('catalog.stockPrompt.skip') }}
          </AppButton>
          <AppButton type="button" variant="primary" @click="openInitialStockAdjustment">
            {{ t('catalog.stockPrompt.addStock') }}
          </AppButton>
        </div>
      </div>
    </AppModal>

    <AppModal
      v-model="isAdjustmentModalOpen"
      :title="t('inventory.form.adjustmentTitle')"
      size="md"
    >
      <form class="space-y-4" @submit.prevent="recordAdjustment">
        <div v-if="adjustmentSubmitError" class="lf-error-message" role="alert">
          {{ t(adjustmentSubmitError) }}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput
            id="catalog-adjustment-sku"
            v-model="adjustmentForm.skuId"
            :label="t('inventory.form.skuIdLabel')"
            :placeholder="t('inventory.form.skuIdPlaceholder')"
            required
            @input="adjustmentSubmitError = ''"
          />
          <AppSelect
            id="catalog-adjustment-warehouse"
            v-model="adjustmentForm.warehouseId"
            :label="t('inventory.form.warehouseLabel')"
            :options="warehouseOptions"
            required
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppNumberInput
            id="catalog-adjustment-quantity"
            v-model="adjustmentForm.quantity"
            :allow-decimals="true"
            :label="t('inventory.form.quantityLabel')"
            required
          />
          <AppInput
            id="catalog-adjustment-reason"
            v-model="adjustmentForm.reasonCode"
            :label="t('inventory.form.reasonCodeLabel')"
            class="md:col-span-1"
            required
          />
        </div>
        <AppInput
          id="catalog-adjustment-notes"
          v-model="adjustmentForm.notes"
          :label="t('inventory.form.notesLabel')"
        />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isAdjustmentModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">
            {{ t('inventory.actions.adjust') }}
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>
