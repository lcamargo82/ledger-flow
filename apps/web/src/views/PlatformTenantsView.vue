<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import { usePlatformTenantsStore } from '../stores/platform-tenants.store'
import { formatDateTime } from '../utils/date-format'

import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppCard from '../components/common/AppCard.vue'
import AppInput from '../components/common/AppInput.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppErrorState from '../components/common/AppErrorState.vue'

const { t, currentLocale } = useI18n()
const platformTenantsStore = usePlatformTenantsStore()

const searchQuery = ref('')
const selectedStatus = ref('')
const selectedPlan = ref('')

const statusOptions = computed(() => [
  { value: '', label: t('platformTenants.statusAll') },
  { value: 'active', label: t('platformTenants.status.active') },
  { value: 'inactive', label: t('platformTenants.status.inactive') }
])

const planOptions = computed(() => [
  { value: '', label: t('platformTenants.planAll') },
  { value: 'FREE', label: 'Free' },
  { value: 'STARTER', label: 'Starter' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
  { value: 'CUSTOM', label: 'Custom' }
])

const columns = computed(() => [
  { key: 'name', label: t('platformTenants.table.name') },
  { key: 'plan', label: t('platformTenants.table.plan') },
  { key: 'status', label: t('platformTenants.table.status') },
  { key: 'createdAt', label: t('platformTenants.table.createdAt') },
  { key: 'actions', label: t('platformTenants.table.actions'), align: 'right' as const }
])

onMounted(() => {
  fetchTenants()
})

const fetchTenants = () => {
  platformTenantsStore.fetchTenants({
    search: searchQuery.value || undefined,
    active: selectedStatus.value === 'active' ? true : selectedStatus.value === 'inactive' ? false : undefined,
    plan: selectedPlan.value ? (selectedPlan.value as any) : undefined,
  })
}

const handleSearch = () => {
  fetchTenants()
}

</script>

<template>
  <div class="space-y-6">
    <AppPageHeader 
      :title="t('platformTenants.title')" 
      :description="t('platformTenants.description')"
    />

    <AppErrorState 
      v-if="platformTenantsStore.error && !platformTenantsStore.tenants.length" 
      title="Error" 
      :description="platformTenantsStore.error"
      @retry="fetchTenants"
    />

    <template v-else>
      <!-- Filters -->
      <AppCard class="mb-6">
        <div class="filters-row">
          <div class="filter-item filter-item--large">
            <AppInput 
              id="search"
              v-model="searchQuery"
              :label="t('platformTenants.searchLabel')"
              :placeholder="t('platformTenants.searchPlaceholder')"
              @input="handleSearch"
            />
          </div>
          <div class="filter-item">
            <AppSelect
              id="status"
              v-model="selectedStatus"
              :label="t('platformTenants.statusLabel')"
              :options="statusOptions"
              @change="handleSearch"
            />
          </div>
          <div class="filter-item">
            <AppSelect
              id="plan"
              v-model="selectedPlan"
              :label="t('platformTenants.planLabel')"
              :options="planOptions"
              @change="handleSearch"
            />
          </div>
        </div>
      </AppCard>

      <!-- Table -->
      <AppTable 
        :columns="columns" 
        :items="platformTenantsStore.tenants" 
        :is-loading="platformTenantsStore.loading"
        :empty-title="t('platformTenants.emptyTitle')"
        :empty-description="t('platformTenants.emptyDescription')"
      >
        <template #name="{ item }">
          <div class="font-medium text-gray-900 dark:text-white">{{ item.name }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">{{ item.slug }}</div>
        </template>
        
        <template #plan="{ item }">
          <span class="text-sm text-gray-700 dark:text-gray-300">
            {{ item.subscription?.plan || 'N/A' }}
          </span>
        </template>

        <template #status="{ item }">
          <AppBadge :variant="item.active ? 'success' : 'danger'">
            {{ item.active ? t('platformTenants.status.active') : t('platformTenants.status.inactive') }}
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
              @click="$router.push(`/platform/tenants/${item.id}`)"
            >
              {{ t('platformTenants.actions.view') }}
            </AppButton>
          </div>
        </template>
      </AppTable>
    </template>
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
