<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useUsersStore } from '../stores/users.store'
import { formatDateTime } from '../utils/date-format'
import { useDebounceFn } from '../composables/useDebounce'

import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppCard from '../components/common/AppCard.vue'
import AppInput from '../components/common/AppInput.vue'
import AppButton from '../components/common/AppButton.vue'
import AppBadge from '../components/common/AppBadge.vue'
import AppTable from '../components/common/AppTable.vue'
import AppModal from '../components/common/AppModal.vue'
import AppErrorState from '../components/common/AppErrorState.vue'

// Import toast if available
import { useToastStore } from '../stores/toast.store'

const { t, currentLocale } = useI18n()
const usersStore = useUsersStore()
const toast = useToastStore()

const searchInput = ref(usersStore.filters.search || '')

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

const openUserDetails = async (id: string) => {
  await usersStore.fetchUserById(id)
  if (!usersStore.error) {
    isModalOpen.value = true
  }
}

const handleNewUser = () => {
  toast.info(t('users.toast.newUserSoon'))
}

const getRoleBadgeVariant = (role: string) => {
  if (role === 'OWNER') return 'info'
  if (role === 'DEVELOPER') return 'success'
  if (role === 'FINANCE_OPERATOR') return 'warning'
  return 'default'
}

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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <AppInput 
              id="search"
              v-model="searchInput"
              :label="t('users.searchLabel')"
              :placeholder="t('users.searchPlaceholder')"
              @input="handleSearch"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('users.statusLabel') }}
            </label>
            <select 
              v-model="usersStore.filters.status" 
              @change="usersStore.setStatus(usersStore.filters.status as 'active' | 'inactive' | 'all')"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">{{ t('users.statusAll') }}</option>
              <option value="active">{{ t('users.statusActive') }}</option>
              <option value="inactive">{{ t('users.statusInactive') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('users.roleLabel') }}
            </label>
            <select 
              v-model="usersStore.filters.role" 
              @change="usersStore.setRole(usersStore.filters.role || '')"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">{{ t('users.roleAll') }}</option>
              <option value="OWNER">Owner</option>
              <option value="FINANCE_OPERATOR">Finance Operator</option>
              <option value="SUPPORT_VIEWER">Support Viewer</option>
              <option value="DEVELOPER">Developer</option>
            </select>
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
          <AppButton 
            variant="secondary" 
            size="small"
            @click="openUserDetails(item.id)"
          >
            {{ t('users.actions.viewDetails') }}
          </AppButton>
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
  </div>
</template>
