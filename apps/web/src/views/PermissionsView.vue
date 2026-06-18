<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { usePermissionsStore } from '../stores/permissions.store'
import { useAuthStore } from '../stores/auth.store'
import { formatDateTime } from '../utils/date-format'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppTable from '../components/common/AppTable.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'

const { t, currentLocale } = useI18n()
const permissionsStore = usePermissionsStore()
const authStore = useAuthStore()

const searchInput = ref('')

const columns = computed(() => [
  { key: 'key', label: t('permissions.table.key') },
  { key: 'description', label: t('permissions.table.description') },
  { key: 'createdAt', label: t('permissions.table.createdAt') }
])

onMounted(() => {
  if (authStore.checkPermission('permissions:read')) {
    permissionsStore.fetchPermissions()
  }
})

const filteredPermissions = computed(() => {
  const query = searchInput.value.toLowerCase()
  if (!query) return permissionsStore.permissions
  
  return permissionsStore.permissions.filter(p => 
    p.key.toLowerCase().includes(query) || 
    (p.description && p.description.toLowerCase().includes(query))
  )
})
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader 
      :title="t('permissions.title')" 
      :description="t('permissions.description')"
    />

    <AppErrorState 
      v-if="permissionsStore.error && !permissionsStore.permissions.length" 
      :title="t('permissions.errorTitle')" 
      :description="t(permissionsStore.error) || t('permissions.errorDescription')"
      @retry="permissionsStore.fetchPermissions()"
    />

    <template v-else>
      <div class="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="w-full max-w-md">
          <AppInput 
            id="search"
            v-model="searchInput"
            :placeholder="t('permissions.searchPlaceholder')"
          />
        </div>
      </div>

      <AppTable 
        :columns="columns" 
        :items="filteredPermissions" 
        :is-loading="permissionsStore.isLoading"
        :empty-title="t('permissions.emptyTitle')"
        :empty-description="t('permissions.emptyDescription')"
      >
        <template #key="{ item }">
          <span class="font-medium font-mono text-xs text-indigo-600 dark:text-indigo-400">{{ item.key }}</span>
        </template>

        <template #createdAt="{ item }">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDateTime(item.createdAt, currentLocale) }}
          </span>
        </template>
      </AppTable>
    </template>
  </div>
</template>
