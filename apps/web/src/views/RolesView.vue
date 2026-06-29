<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useRolesStore } from '../stores/roles.store'
import { useAuthStore } from '../stores/auth.store'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppTable from '../components/common/AppTable.vue'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppModal from '../components/common/AppModal.vue'
import AppErrorState from '../components/common/AppErrorState.vue'

const { t } = useI18n()
const rolesStore = useRolesStore()
const authStore = useAuthStore()

const columns = computed(() => [
  { key: 'key', label: t('roles.table.key') },
  { key: 'name', label: t('roles.table.name') },
  { key: 'description', label: t('roles.table.description') },
  { key: 'system', label: t('roles.table.system') },
  { key: 'permissionsCount', label: t('roles.table.permissionsCount') },
  { key: 'actions', label: t('roles.table.actions'), align: 'right' as const }
])

onMounted(() => {
  if (authStore.checkPermission('roles:manage')) {
    rolesStore.fetchRoles()
  }
})

const isModalOpen = ref(false)

const openRoleDetails = async (id: string) => {
  await rolesStore.fetchRoleById(id)
  if (!rolesStore.error) {
    isModalOpen.value = true
  }
}

const getRoleField = (item: any, field: 'name' | 'description') => {
  const i18nKey = `roles.list.${item.key}.${field}`
  const translation = t(i18nKey)
  if (translation.startsWith('[') && translation.endsWith(']')) {
    return item[field]
  }
  return translation
}

const getPermissionDescription = (key: string) => {
  const i18nKey = `permissions.list.${key.replace(/:/g, '.')}`
  const translation = t(i18nKey)
  return translation.startsWith('[') ? key : translation
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader 
      :title="t('roles.title')" 
      :description="t('roles.description')"
    />

    <AppErrorState 
      v-if="rolesStore.error && !rolesStore.roles.length" 
      :title="t('roles.errorTitle')" 
      :description="t(rolesStore.error) || t('roles.errorDescription')"
      @retry="rolesStore.fetchRoles()"
    />

    <template v-else>
      <AppTable 
        :columns="columns" 
        :items="rolesStore.roles" 
        :is-loading="rolesStore.isLoading"
        :empty-title="t('roles.emptyTitle')"
        :empty-description="t('roles.emptyDescription')"
      >
        <template #key="{ item }">
          <div class="flex items-center gap-2">
            <span class="font-medium font-mono text-xs text-gray-700 dark:text-gray-300">{{ item.key }}</span>
            <AppBadge v-if="item.key === 'PLATFORM_OWNER'" variant="warning">
              Platform
            </AppBadge>
          </div>
        </template>

        <template #name="{ item }">
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ getRoleField(item, 'name') }}
          </span>
        </template>

        <template #description="{ item }">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ getRoleField(item, 'description') }}
          </span>
        </template>

        <template #system="{ item }">
          <AppBadge :variant="item.system ? 'info' : 'default'">
            {{ item.system ? t('roles.system.yes') : t('roles.system.no') }}
          </AppBadge>
        </template>

        <template #permissionsCount="{ item }">
          <AppBadge variant="default">
            {{ item.permissions?.length || 0 }}
          </AppBadge>
        </template>

        <template #actions="{ item }">
          <div class="flex justify-end gap-2">
            <AppButton 
              variant="secondary" 
              size="small"
              @click="openRoleDetails(item.id)"
            >
              {{ t('roles.actions.viewDetails') }}
            </AppButton>
          </div>
        </template>
      </AppTable>
    </template>

    <!-- Details Modal -->
    <AppModal 
      v-model="isModalOpen" 
      :title="t('roles.details.title')" 
      size="md"
    >
      <div v-if="rolesStore.isLoadingDetails" class="py-8 flex justify-center">
        <span class="text-gray-500">{{ t('common.loading') }}</span>
      </div>
      
      <div v-else-if="rolesStore.selectedRole" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('roles.table.name') }}</h4>
            <p class="text-gray-900 dark:text-white font-medium">{{ getRoleField(rolesStore.selectedRole, 'name') }}</p>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('roles.table.key') }}</h4>
            <p class="text-gray-900 dark:text-white font-mono text-sm">{{ rolesStore.selectedRole.key }}</p>
          </div>
          <div class="col-span-2">
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('roles.table.description') }}</h4>
            <p class="text-gray-900 dark:text-white">{{ getRoleField(rolesStore.selectedRole, 'description') || '-' }}</p>
          </div>
          <div class="col-span-2">
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{{ t('roles.details.permissions') }} ({{ rolesStore.selectedRole.permissions.length }})</h4>
            <div class="flex gap-1 flex-wrap">
              <AppBadge 
                v-for="perm in rolesStore.selectedRole.permissions" 
                :key="perm" 
                :variant="perm.startsWith('platform:') ? 'warning' : 'default'"
                :title="getPermissionDescription(perm)"
              >
                {{ perm }}
              </AppBadge>
            </div>
            <p v-if="rolesStore.selectedRole.permissions.length === 0" class="text-sm text-gray-500">
              {{ t('roles.details.noPermissions') }}
            </p>
          </div>
        </div>
      </div>
    </AppModal>
  </div>
</template>
