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
import AppCard from '../components/common/AppCard.vue'
import AppBadge from '../components/common/AppBadge.vue'
import AppSelect from '../components/common/AppSelect.vue'

const { t, currentLocale } = useI18n()
const permissionsStore = usePermissionsStore()
const authStore = useAuthStore()

const searchInput = ref('')
const selectedScope = ref('')

const scopeOptions = computed(() => [
  { value: '', label: t('permissions.scope.all') },
  { value: 'TENANT', label: t('permissions.scope.tenant') },
  { value: 'PLATFORM', label: t('permissions.scope.platform') },
])

const columns = computed(() => {
  const base = [
    { key: 'key', label: t('permissions.table.key') },
    { key: 'description', label: t('permissions.table.description') },
  ]
  if (authStore.user?.isPlatformAdmin) {
    base.push({ key: 'scope', label: t('permissions.table.scope') })
  }
  base.push({ key: 'createdAt', label: t('permissions.table.createdAt') })
  return base
})

onMounted(() => {
  if (authStore.checkPermission('permissions:read')) {
    permissionsStore.fetchPermissions()
  }
})

const filteredPermissions = computed(() => {
  const query = searchInput.value.toLowerCase()
  let list = permissionsStore.permissions
  
  if (selectedScope.value) {
    list = list.filter(p => p.scope === selectedScope.value)
  }

  if (!query) return list
  
  return list.filter(p => 
    p.key.toLowerCase().includes(query) || 
    (p.description && p.description.toLowerCase().includes(query)) ||
    getPermissionDescription(p).toLowerCase().includes(query)
  )
})

const getPermissionDescription = (item: any) => {
  const i18nKey = `permissions.list.${item.key.replace(/:/g, '.')}`
  const translation = t(i18nKey)
  if (translation.startsWith('[') && translation.endsWith(']')) {
    return item.description
  }
  return translation
}
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
      <AppCard class="lf-mb-6">
        <div class="flex flex-col sm:flex-row gap-4 w-full">
          <div class="w-full sm:w-2/3">
            <AppInput 
              id="search"
              v-model="searchInput"
              :placeholder="t('permissions.searchPlaceholder')"
            />
          </div>
          <div class="w-full sm:w-1/3" v-if="authStore.user?.isPlatformAdmin">
            <AppSelect
              id="scope-filter"
              v-model="selectedScope"
              :options="scopeOptions"
            />
          </div>
        </div>
      </AppCard>

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

        <template #description="{ item }">
          <span class="text-sm text-gray-700 dark:text-gray-300">
            {{ getPermissionDescription(item) }}
          </span>
        </template>

        <template #scope="{ item }">
          <AppBadge :variant="item.scope === 'PLATFORM' ? 'warning' : 'info'">
            {{ item.scope === 'PLATFORM' ? t('permissions.scopeBadge.platform') : t('permissions.scopeBadge.tenant') }}
          </AppBadge>
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
