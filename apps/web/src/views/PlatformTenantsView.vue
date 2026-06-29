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
import AppModal from '../components/common/AppModal.vue'
import type { CreatePlatformTenantDto } from '../types/platform.types'
import { SubscriptionPlan, TenantSubscriptionStatus } from '../types/platform.types'

const { t, currentLocale } = useI18n()
const platformTenantsStore = usePlatformTenantsStore()

const searchQuery = ref('')
const selectedStatus = ref('')
const selectedPlan = ref('')

const isCreateModalOpen = ref(false)
const currentStep = ref(1)

const createForm = ref<CreatePlatformTenantDto>({
  organization: {
    name: '',
    slug: '',
    timezone: 'America/Sao_Paulo',
  },
  owner: {
    name: '',
    email: '',
  },
  subscription: {
    plan: SubscriptionPlan.STARTER,
    status: TenantSubscriptionStatus.TRIAL,
    trialEndsAt: '',
  },
})

const resetCreateForm = () => {
  createForm.value = {
    organization: { name: '', slug: '', timezone: 'America/Sao_Paulo' },
    owner: { name: '', email: '' },
    subscription: { plan: SubscriptionPlan.STARTER, status: TenantSubscriptionStatus.TRIAL, trialEndsAt: '' },
  }
  currentStep.value = 1
}

const openCreateModal = () => {
  resetCreateForm()
  isCreateModalOpen.value = true
}

const autoFillSlug = () => {
  if (createForm.value.organization.name && !createForm.value.organization.slug) {
    createForm.value.organization.slug = createForm.value.organization.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

const nextStep = () => {
  if (currentStep.value < 3) currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

const handleCreateTenant = async () => {
  try {
    await platformTenantsStore.createTenant(createForm.value)
    isCreateModalOpen.value = false
    fetchTenants()
  } catch (err) {
    // error handled by store
  }
}

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
    >
      <template #actions>
        <AppButton @click="openCreateModal">
          {{ t('platformTenants.createModal.button') }}
        </AppButton>
      </template>
    </AppPageHeader>

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

        <template #actions>
          <div class="flex justify-end gap-2">
            <AppButton 
              variant="secondary" 
              size="small"
            >
              {{ t('platformTenants.actions.view') }}
            </AppButton>
          </div>
        </template>
      </AppTable>
    </template>

    <AppModal
      v-model="isCreateModalOpen"
      :title="t('platformTenants.createModal.title')"
    >
      <div class="create-tenant-steps">
        <div class="step-indicator">
          <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">{{ t('platformTenants.createModal.steps.organization') }}</div>
          <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">{{ t('platformTenants.createModal.steps.subscription') }}</div>
          <div class="step" :class="{ active: currentStep === 3 }">{{ t('platformTenants.createModal.steps.owner') }}</div>
        </div>

        <form @submit.prevent="currentStep === 3 ? handleCreateTenant() : nextStep()">
          <div v-if="currentStep === 1" class="step-content space-y-4">
            <AppInput
              id="orgName"
              :label="t('platformTenants.createModal.organization.nameLabel')"
              v-model="createForm.organization.name"
              required
              @blur="autoFillSlug"
            />
            <AppInput
              id="orgSlug"
              :label="t('platformTenants.createModal.organization.slugLabel')"
              v-model="createForm.organization.slug"
              required
            />
            <AppSelect
              id="orgTimezone"
              :label="t('platformTenants.createModal.organization.timezoneLabel')"
              v-model="createForm.organization.timezone"
              :options="[{value: 'America/Sao_Paulo', label: t('platformTenants.createModal.organization.timezoneSaoPaulo')}]"
              required
            />
          </div>

          <div v-if="currentStep === 2" class="step-content space-y-4">
            <AppSelect
              id="subPlan"
              :label="t('platformTenants.createModal.subscription.planLabel')"
              v-model="createForm.subscription.plan"
              :options="planOptions.filter(o => o.value !== '')"
              required
            />
            <AppSelect
              id="subStatus"
              :label="t('platformTenants.createModal.subscription.statusLabel')"
              v-model="createForm.subscription.status"
              :options="[
                {value: 'TRIAL', label: t('platformTenants.createModal.subscription.trialLabel')},
                {value: 'ACTIVE', label: t('platformTenants.createModal.subscription.activeLabel')}
              ]"
              required
            />
            <AppInput
              v-if="createForm.subscription.status === 'TRIAL'"
              id="subTrial"
              type="date"
              :label="t('platformTenants.createModal.subscription.trialEndsAtLabel')"
              v-model="createForm.subscription.trialEndsAt"
              required
            />
          </div>

          <div v-if="currentStep === 3" class="step-content space-y-4">
            <AppInput
              id="ownerName"
              :label="t('platformTenants.createModal.owner.nameLabel')"
              v-model="createForm.owner.name"
              required
            />
            <AppInput
              id="ownerEmail"
              type="email"
              :label="t('platformTenants.createModal.owner.emailLabel')"
              v-model="createForm.owner.email"
              required
            />
            <div class="bg-blue-50 text-blue-800 p-4 rounded text-sm mt-4">
              {{ t('platformTenants.createModal.owner.infoMessage') }}
            </div>
          </div>

          <div class="mt-6 flex justify-between">
            <AppButton v-if="currentStep > 1" type="button" variant="secondary" @click="prevStep">{{ t('platformTenants.createModal.actions.back') }}</AppButton>
            <div v-else></div>
            <AppButton v-if="currentStep < 3" type="submit">{{ t('platformTenants.createModal.actions.next') }}</AppButton>
            <AppButton v-else type="submit" :loading="platformTenantsStore.loading">{{ t('platformTenants.createModal.actions.submit') }}</AppButton>
          </div>
        </form>
      </div>
    </AppModal>
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

.step-indicator {
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.step {
  flex: 1;
  text-align: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary, #6b7280);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.step.active {
  color: var(--primary, #3b82f6);
  border-bottom-color: var(--primary, #3b82f6);
}

.step.completed {
  color: var(--success, #10b981);
}
</style>
