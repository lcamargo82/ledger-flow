<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useUsersStore } from '../stores/users.store'
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
import UserForm from '../components/users/UserForm.vue'

// Import toast if available
import { useToastStore } from '../stores/toast.store'

const { t, currentLocale } = useI18n()
const usersStore = useUsersStore()
const authStore = useAuthStore()
const toast = useToastStore()

const searchInput = ref(usersStore.filters.search || '')

const availableRoles = computed(() => [
  { key: 'OWNER', label: t('users.roles.OWNER') },
  { key: 'FINANCE_OPERATOR', label: t('users.roles.FINANCE_OPERATOR') },
  { key: 'SUPPORT_VIEWER', label: t('users.roles.SUPPORT_VIEWER') },
  { key: 'DEVELOPER', label: t('users.roles.DEVELOPER') }
])

// Table columns
const columns = computed(() => [
  { key: 'name', label: t('users.table.name') },
  { key: 'email', label: t('users.table.email') },
  { key: 'roles', label: t('users.table.roles') },
  { key: 'status', label: t('users.table.status') },
  { key: 'lastLoginAt', label: t('users.table.lastLogin') },
  { key: 'createdAt', label: t('users.table.createdAt') },
  { key: 'actions', label: t('users.table.actions'), align: 'right' as const }
])

onMounted(() => {
  usersStore.fetchUsers()
})

const handleSearch = useDebounceFn(() => {
  usersStore.setSearch(searchInput.value)
}, 500)

const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isConfirmStatusOpen = ref(false)
const targetUser = ref<any>(null)

const openUserDetails = async (id: string) => {
  await usersStore.fetchUserById(id)
  if (!usersStore.error) {
    isModalOpen.value = true
  }
}

const handleNewUser = () => {
  isCreateModalOpen.value = true
}

const handleCreateUser = async (payload: any) => {
  try {
    await usersStore.createUser(payload)
    isCreateModalOpen.value = false
  } catch (err) {
    // error is handled in store
  }
}

const openEditModal = async (id: string) => {
  await usersStore.fetchUserById(id)
  if (!usersStore.error && usersStore.selectedUser) {
    targetUser.value = { ...usersStore.selectedUser }
    isEditModalOpen.value = true
  }
}

const handleEditUser = async (payload: any) => {
  if (!targetUser.value) return
  
  try {
    await usersStore.updateUser(targetUser.value.id, {
      name: payload.name,
      email: payload.email
    })
    
    const oldRoles = targetUser.value.roles || []
    const newRoles = payload.roleKeys || []
    
    const rolesChanged = oldRoles.length !== newRoles.length || 
                         oldRoles.some((r: string) => !newRoles.includes(r))
                         
    if (rolesChanged) {
      await usersStore.updateUserRoles(targetUser.value.id, newRoles)
    }
    
    isEditModalOpen.value = false
  } catch (err) {
    // error is handled in store
  }
}

const openStatusModal = (user: any) => {
  targetUser.value = user
  isConfirmStatusOpen.value = true
}

const handleStatusChange = async () => {
  if (!targetUser.value) return
  try {
    await usersStore.updateUserStatus(targetUser.value.id, !targetUser.value.active)
    isConfirmStatusOpen.value = false
  } catch (err) {
    // error is handled in store
  }
}

const getRoleBadgeVariant = (role: string) => {
  if (role === 'OWNER') return 'info'
  if (role === 'DEVELOPER') return 'success'
  if (role === 'FINANCE_OPERATOR') return 'warning'
  return 'default'
}

const statusOptions = computed(() => [
  { value: 'all', label: t('users.statusAll') },
  { value: 'active', label: t('users.statusActive') },
  { value: 'inactive', label: t('users.statusInactive') }
])

const filterRoleOptions = computed(() => [
  { value: '', label: t('users.roleAll') },
  ...availableRoles.value.map(r => ({ value: r.key, label: r.label }))
])
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader 
      :title="t('users.title')" 
      :description="t('users.description')"
    >
      <template #actions>
        <AppButton 
          v-if="authStore.checkPermission('users:create')"
          variant="primary" 
          @click="handleNewUser"
        >
          {{ t('users.newUser') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Error State -->
    <AppErrorState 
      v-if="usersStore.error && !usersStore.users.length" 
      :title="t('users.errorTitle')" 
      :description="t(usersStore.error) || t('users.errorDescription')"
      @retry="usersStore.fetchUsers()"
    />

    <template v-else>
      <!-- Filters -->
      <AppCard class="mb-6">
        <div class="filters-row">
          <div class="filter-item filter-item--large">
            <AppInput 
              id="search"
              v-model="searchInput"
              :label="t('users.searchLabel')"
              :placeholder="t('users.searchPlaceholder')"
              @input="handleSearch"
            />
          </div>
          <div class="filter-item">
            <AppSelect
              id="status"
              v-model="usersStore.filters.status"
              :label="t('users.statusLabel')"
              :options="statusOptions"
              @change="usersStore.setStatus(usersStore.filters.status as 'active' | 'inactive' | 'all')"
            />
          </div>
          <div class="filter-item">
            <AppSelect
              id="role"
              v-model="usersStore.filters.role"
              :label="t('users.roleLabel')"
              :options="filterRoleOptions"
              @change="usersStore.setRole(usersStore.filters.role || '')"
            />
          </div>
        </div>
      </AppCard>

      <!-- Table -->
      <AppTable 
        :columns="columns" 
        :items="usersStore.users" 
        :is-loading="usersStore.isLoading"
        :empty-title="t('users.emptyTitle')"
        :empty-description="t('users.emptyDescription')"
      >
        <template #name="{ item }">
          <span class="font-medium text-gray-900 dark:text-white">{{ item.name }}</span>
        </template>
        
        <template #roles="{ item }">
          <div class="flex gap-1 flex-wrap">
            <AppBadge 
              v-for="role in item.roles" 
              :key="role" 
              :variant="getRoleBadgeVariant(role)"
            >
              {{ role }}
            </AppBadge>
          </div>
        </template>

        <template #status="{ item }">
          <AppBadge :variant="item.active ? 'success' : 'danger'">
            {{ item.active ? t('users.status.active') : t('users.status.inactive') }}
          </AppBadge>
        </template>

        <template #lastLoginAt="{ item }">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDateTime(item.lastLoginAt, currentLocale) }}
          </span>
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
              @click="openUserDetails(item.id)"
            >
              {{ t('users.actions.viewDetails') }}
            </AppButton>
            <AppButton 
              v-if="authStore.checkPermission('users:update')"
              variant="secondary" 
              size="small"
              @click="openEditModal(item.id)"
            >
              {{ t('users.actions.edit') }}
            </AppButton>
            <AppButton 
              v-if="authStore.checkPermission('users:update')"
              :variant="item.active ? 'danger' : 'primary'"
              size="small"
              @click="openStatusModal(item)"
            >
              {{ item.active ? t('users.actions.deactivate') : t('users.actions.activate') }}
            </AppButton>
          </div>
        </template>
      </AppTable>

      <!-- Pagination -->
      <div v-if="usersStore.totalPages > 1" class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          {{ t('users.pagination.pageOf', { page: usersStore.currentPage, totalPages: usersStore.totalPages }) }}
        </div>
        <div class="flex gap-2">
          <AppButton 
            variant="secondary" 
            size="small" 
            :disabled="usersStore.currentPage <= 1 || usersStore.isLoading"
            @click="usersStore.setPage(usersStore.currentPage - 1)"
          >
            {{ t('users.pagination.previous') }}
          </AppButton>
          <AppButton 
            variant="secondary" 
            size="small" 
            :disabled="usersStore.currentPage >= usersStore.totalPages || usersStore.isLoading"
            @click="usersStore.setPage(usersStore.currentPage + 1)"
          >
            {{ t('users.pagination.next') }}
          </AppButton>
        </div>
      </div>
    </template>

    <!-- Details Modal -->
    <AppModal 
      v-model="isModalOpen" 
      :title="t('users.details.title')" 
      size="md"
    >
      <div v-if="usersStore.isLoadingDetails" class="py-8 flex justify-center">
        <span class="text-gray-500">{{ t('common.loading') }}</span>
      </div>
      
      <div v-else-if="usersStore.selectedUser" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('users.details.name') }}</h4>
            <p class="text-gray-900 dark:text-white font-medium">{{ usersStore.selectedUser.name }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('users.details.email') }}</h4>
            <p class="text-gray-900 dark:text-white">{{ usersStore.selectedUser.email }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('users.details.status') }}</h4>
            <AppBadge :variant="usersStore.selectedUser.active ? 'success' : 'danger'">
              {{ usersStore.selectedUser.active ? t('users.status.active') : t('users.status.inactive') }}
            </AppBadge>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('users.details.roles') }}</h4>
            <div class="flex gap-1 flex-wrap">
              <AppBadge 
                v-for="role in usersStore.selectedUser.roles" 
                :key="role" 
                :variant="getRoleBadgeVariant(role)"
              >
                {{ role }}
              </AppBadge>
            </div>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('users.details.lastLoginAt') }}</h4>
            <p class="text-gray-900 dark:text-white text-sm">{{ formatDateTime(usersStore.selectedUser.lastLoginAt, currentLocale) }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('users.details.createdAt') }}</h4>
            <p class="text-gray-900 dark:text-white text-sm">{{ formatDateTime(usersStore.selectedUser.createdAt, currentLocale) }}</p>
          </div>
        </div>
      </div>
    </AppModal>

    <!-- Create Modal -->
    <AppModal 
      v-model="isCreateModalOpen" 
      :title="t('users.form.createTitle')" 
      size="md"
    >
      <UserForm
        mode="create"
        :available-roles="availableRoles"
        :loading="usersStore.isSaving"
        @submit="handleCreateUser"
        @cancel="isCreateModalOpen = false"
      />
    </AppModal>

    <!-- Edit Modal -->
    <AppModal 
      v-model="isEditModalOpen" 
      :title="t('users.form.editTitle')" 
      size="md"
    >
      <div v-if="usersStore.isLoadingDetails" class="py-8 flex justify-center">
        <span class="text-gray-500">{{ t('common.loading') }}</span>
      </div>
      <UserForm
        v-else-if="targetUser"
        mode="edit"
        :initial-value="targetUser"
        :available-roles="availableRoles"
        :loading="usersStore.isSaving"
        @submit="handleEditUser"
        @cancel="isEditModalOpen = false"
      />
    </AppModal>

    <!-- Confirm Status Change -->
    <AppConfirmDialog
      v-model="isConfirmStatusOpen"
      :title="targetUser?.active ? t('users.confirmDeactivate.title') : t('users.confirmActivate.title')"
      :message="targetUser?.active ? t('users.confirmDeactivate.message') : t('users.confirmActivate.message')"
      :confirm-text="t('common.confirm')"
      :confirm-variant="targetUser?.active ? 'danger' : 'primary'"
      :loading="usersStore.isSaving"
      @confirm="handleStatusChange"
    />
  </div>
</template>

<style scoped>
.mb-6 {
  margin-bottom: var(--lf-space-6);
}

.filters-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--lf-space-4);
  align-items: flex-end;
}

@media (min-width: 768px) {
  .filters-row {
    flex-wrap: nowrap;
  }
}

.filter-item {
  flex: 1;
  min-width: 150px;
}

.filter-item--large {
  min-width: 200px;
}
</style>
