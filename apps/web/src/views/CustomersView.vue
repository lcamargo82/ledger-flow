<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import type { CustomerListItem } from '../types/customers.types'
import { useCustomersStore } from '../stores/customers.store'
import { formatDateTime } from '../utils/date-format'
import { useDebounceFn } from '../composables/useDebounce'

import { useAuthStore } from '../stores/auth.store'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppCard from '../components/common/AppCard.vue'
import AppInput from '../components/common/AppInput.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppButton from '../components/common/AppButton.vue'
import AppBadge from '../components/common/AppBadge.vue'
import AppTable from '../components/common/AppTable.vue'
import AppModal from '../components/common/AppModal.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppConfirmDialog from '../components/common/AppConfirmDialog.vue'
import CustomerForm from '../components/customers/CustomerForm.vue'

const { t, currentLocale } = useI18n()
const customersStore = useCustomersStore()
const authStore = useAuthStore()

const searchInput = ref(customersStore.filters.search || '')

// Table columns
const columns = computed(() => [
  { key: 'name', label: t('customers.table.name') },
  { key: 'email', label: t('customers.table.email') },
  { key: 'document', label: t('customers.table.document') },
  { key: 'type', label: t('customers.table.type') },
  { key: 'status', label: t('customers.table.status') },
  { key: 'createdAt', label: t('customers.table.createdAt') },
  { key: 'actions', label: t('customers.table.actions'), align: 'right' as const }
])

onMounted(() => {
  customersStore.fetchCustomers()
})

const handleSearch = useDebounceFn(() => {
  customersStore.setSearch(searchInput.value)
}, 500)

const clearFilters = () => {
  searchInput.value = ''
  customersStore.resetFilters()
}

const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isConfirmStatusOpen = ref(false)
const targetCustomer = ref<CustomerListItem | null>(null)

const openCustomerDetails = async (id: string) => {
  await customersStore.fetchCustomerById(id)
  if (!customersStore.error) {
    isModalOpen.value = true
  }
}

const handleNewCustomer = () => {
  isCreateModalOpen.value = true
}

const handleCreateCustomer = async (payload: Record<string, unknown>) => {
  try {
    await customersStore.createCustomer(payload)
    isCreateModalOpen.value = false
  } catch {
    // error is handled in store
  }
}

const openEditModal = async (id: string) => {
  await customersStore.fetchCustomerById(id)
  if (!customersStore.error && customersStore.selectedCustomer) {
    targetCustomer.value = { ...customersStore.selectedCustomer }
    isEditModalOpen.value = true
  }
}

const handleEditCustomer = async (payload: Record<string, unknown>) => {
  if (!targetCustomer.value) return
  
  try {
    await customersStore.updateCustomer(targetCustomer.value.id, payload)
    isEditModalOpen.value = false
  } catch {
    // error is handled in store
  }
}

const openStatusModal = (customer: CustomerListItem) => {
  targetCustomer.value = customer
  isConfirmStatusOpen.value = true
}

const handleStatusChange = async () => {
  if (!targetCustomer.value) return
  try {
    await customersStore.updateCustomerStatus(targetCustomer.value.id, !targetCustomer.value.active)
    isConfirmStatusOpen.value = false
  } catch {
    // error is handled in store
  }
}

const statusOptions = computed(() => [
  { value: 'all', label: t('customers.filters.statusAll') },
  { value: 'active', label: t('customers.filters.statusActive') },
  { value: 'inactive', label: t('customers.filters.statusInactive') }
])

const typeOptions = computed(() => [
  { value: 'all', label: t('customers.filters.typeAll') },
  { value: 'INDIVIDUAL', label: t('customers.type.INDIVIDUAL') },
  { value: 'COMPANY', label: t('customers.type.COMPANY') }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader 
      :title="t('customers.title')" 
      :description="t('customers.description')"
    >
      <template #actions>
        <AppButton 
          v-if="authStore.checkPermission('customers:create')"
          variant="primary" 
          @click="handleNewCustomer"
        >
          {{ t('customers.actions.create') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Error State -->
    <AppErrorState 
      v-if="customersStore.error && !customersStore.customers.length" 
      :title="t('customers.error.title')" 
      :description="t(customersStore.error) || t('customers.error.description')"
      @retry="customersStore.fetchCustomers()"
    />

    <template v-else>
      <!-- Filters -->
      <AppCard class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <AppInput 
              id="search"
              v-model="searchInput"
              :label="t('customers.filters.searchLabel')"
              :placeholder="t('customers.filters.searchPlaceholder')"
              @input="handleSearch"
            />
          </div>
          <div>
            <AppSelect
              id="status"
              v-model="customersStore.filters.status"
              :label="t('customers.filters.statusLabel')"
              :options="statusOptions"
              @change="customersStore.setStatus(customersStore.filters.status as any)"
            />
          </div>
          <div>
            <AppSelect
              id="type"
              v-model="customersStore.filters.type"
              :label="t('customers.filters.typeLabel')"
              :options="typeOptions"
              @change="customersStore.setType(customersStore.filters.type as any)"
            />
          </div>
          <div class="flex gap-2">
            <AppButton variant="secondary" @click="clearFilters">
              {{ t('customers.actions.clearFilters') }}
            </AppButton>
          </div>
        </div>
      </AppCard>

      <!-- Table -->
      <AppTable 
        :columns="columns" 
        :items="customersStore.customers" 
        :is-loading="customersStore.isLoading"
        :empty-title="t('customers.empty.title')"
        :empty-description="t('customers.empty.description')"
      >
        <template #name="{ item }">
          <span class="font-medium text-gray-900 dark:text-white">{{ item.name }}</span>
        </template>
        
        <template #email="{ item }">
          <span class="text-gray-500 dark:text-gray-400">{{ item.email || '-' }}</span>
        </template>

        <template #document="{ item }">
          <span class="text-gray-500 dark:text-gray-400">{{ item.document || '-' }}</span>
        </template>

        <template #type="{ item }">
          <AppBadge :variant="item.type === 'COMPANY' ? 'info' : 'default'">
            {{ t(`customers.type.${item.type}`) }}
          </AppBadge>
        </template>

        <template #status="{ item }">
          <AppBadge :variant="item.active ? 'success' : 'danger'">
            {{ item.active ? t('customers.status.active') : t('customers.status.inactive') }}
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
              variant="secondary" 
              size="small"
              @click="openCustomerDetails(item.id)"
            >
              {{ t('customers.actions.viewDetails') }}
            </AppButton>
            <AppButton 
              v-if="authStore.checkPermission('customers:update')"
              variant="secondary" 
              size="small"
              @click="openEditModal(item.id)"
            >
              {{ t('customers.actions.edit') }}
            </AppButton>
            <AppButton 
              v-if="authStore.checkPermission('customers:update')"
              :variant="item.active ? 'danger' : 'primary'"
              size="small"
              @click="openStatusModal(item)"
            >
              {{ item.active ? t('customers.actions.deactivate') : t('customers.actions.activate') }}
            </AppButton>
          </div>
        </template>
      </AppTable>

      <!-- Pagination -->
      <div v-if="customersStore.totalPages > 1" class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          {{ t('customers.pagination.pageOf', { page: customersStore.currentPage, totalPages: customersStore.totalPages }) }}
        </div>
        <div class="flex gap-2">
          <AppButton 
            variant="secondary" 
            size="small" 
            :disabled="customersStore.currentPage <= 1 || customersStore.isLoading"
            @click="customersStore.setPage(customersStore.currentPage - 1)"
          >
            {{ t('customers.pagination.previous') }}
          </AppButton>
          <AppButton 
            variant="secondary" 
            size="small" 
            :disabled="customersStore.currentPage >= customersStore.totalPages || customersStore.isLoading"
            @click="customersStore.setPage(customersStore.currentPage + 1)"
          >
            {{ t('customers.pagination.next') }}
          </AppButton>
        </div>
      </div>
    </template>

    <!-- Details Modal -->
    <AppModal 
      v-model="isModalOpen" 
      :title="t('customers.details.title')" 
      size="md"
    >
      <div v-if="customersStore.isLoadingDetails" class="py-8 flex justify-center">
        <span class="text-gray-500">{{ t('common.loading') }}</span>
      </div>
      
      <div v-else-if="customersStore.selectedCustomer" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('customers.details.name') }}</h4>
            <p class="text-gray-900 dark:text-white font-medium">{{ customersStore.selectedCustomer.name }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('customers.details.email') }}</h4>
            <p class="text-gray-900 dark:text-white">{{ customersStore.selectedCustomer.email || '-' }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('customers.details.document') }}</h4>
            <p class="text-gray-900 dark:text-white">{{ customersStore.selectedCustomer.document || '-' }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('customers.details.phone') }}</h4>
            <p class="text-gray-900 dark:text-white">{{ customersStore.selectedCustomer.phone || '-' }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('customers.details.type') }}</h4>
            <AppBadge :variant="customersStore.selectedCustomer.type === 'COMPANY' ? 'info' : 'default'">
              {{ t(`customers.type.${customersStore.selectedCustomer.type}`) }}
            </AppBadge>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('customers.details.status') }}</h4>
            <AppBadge :variant="customersStore.selectedCustomer.active ? 'success' : 'danger'">
              {{ customersStore.selectedCustomer.active ? t('customers.status.active') : t('customers.status.inactive') }}
            </AppBadge>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('customers.details.createdAt') }}</h4>
            <p class="text-gray-900 dark:text-white text-sm">{{ formatDateTime(customersStore.selectedCustomer.createdAt, currentLocale) }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('customers.details.updatedAt') }}</h4>
            <p class="text-gray-900 dark:text-white text-sm">{{ formatDateTime(customersStore.selectedCustomer.updatedAt, currentLocale) }}</p>
          </div>
        </div>
      </div>
    </AppModal>

    <!-- Create Modal -->
    <AppModal 
      v-model="isCreateModalOpen" 
      :title="t('customers.form.createTitle')" 
      size="md"
    >
      <CustomerForm
        mode="create"
        :loading="customersStore.isCreating"
        @submit="handleCreateCustomer"
        @cancel="isCreateModalOpen = false"
      />
    </AppModal>

    <!-- Edit Modal -->
    <AppModal 
      v-model="isEditModalOpen" 
      :title="t('customers.form.editTitle')" 
      size="md"
    >
      <div v-if="customersStore.isLoadingDetails" class="py-8 flex justify-center">
        <span class="text-gray-500">{{ t('common.loading') }}</span>
      </div>
      <CustomerForm
        v-else-if="targetCustomer"
        mode="edit"
        :initial-value="targetCustomer"
        :loading="customersStore.isUpdating"
        @submit="handleEditCustomer"
        @cancel="isEditModalOpen = false"
      />
    </AppModal>

    <!-- Confirm Status Change -->
    <AppConfirmDialog
      v-model="isConfirmStatusOpen"
      :title="targetCustomer?.active ? t('customers.confirmDeactivate.title') : t('customers.confirmActivate.title')"
      :message="targetCustomer?.active ? t('customers.confirmDeactivate.message') : t('customers.confirmActivate.message')"
      :confirm-text="targetCustomer?.active ? t('customers.confirmDeactivate.confirm') : t('customers.confirmActivate.confirm')"
      :confirm-variant="targetCustomer?.active ? 'danger' : 'primary'"
      :loading="customersStore.isUpdatingStatus"
      @confirm="handleStatusChange"
    />
  </div>
</template>
