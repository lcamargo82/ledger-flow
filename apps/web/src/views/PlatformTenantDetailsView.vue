<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { usePlatformTenantsStore } from '../stores/platform-tenants.store'

import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppButton from '../components/common/AppButton.vue'
import AppBadge from '../components/common/AppBadge.vue'
import TenantHealthBadge from '../components/platform/TenantHealthBadge.vue'
import TenantOverviewPanel from '../components/platform/TenantOverviewPanel.vue'
import TenantRecentActivity from '../components/platform/TenantRecentActivity.vue'
import AppErrorState from '../components/common/AppErrorState.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const store = usePlatformTenantsStore()

const tenantId = computed(() => route.params.id as string)

onMounted(async () => {
  if (tenantId.value) {
    await store.fetchTenantOverview(tenantId.value)
  }
})

const goBack = () => {
  router.push('/platform/tenants')
}
</script>

<template>
  <div class="space-y-6">
    <AppErrorState 
      v-if="store.error && !store.currentTenantOverview" 
      title="Error" 
      :description="store.error"
      @retry="store.fetchTenantOverview(tenantId)"
    />

    <template v-else-if="store.currentTenantOverview">
      <AppPageHeader 
        :title="store.currentTenantOverview.tenant.name" 
        :description="store.currentTenantOverview.tenant.slug"
      >
        <template #actions>
          <div class="flex gap-2 items-center">
            <AppBadge :variant="store.currentTenantOverview.tenant.active ? 'success' : 'danger'">
              {{ store.currentTenantOverview.tenant.active ? 'Ativo' : 'Inativo' }}
            </AppBadge>
            <AppBadge variant="info">
              {{ store.currentTenantOverview.tenant.subscription.plan }}
            </AppBadge>
            <TenantHealthBadge 
              v-if="store.currentTenantHealth" 
              :status="store.currentTenantHealth.status" 
            />
            <AppButton variant="secondary" @click="goBack">
              {{ t('platform.tenants.overview.backToTenants') }}
            </AppButton>
          </div>
        </template>
      </AppPageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <TenantOverviewPanel :overview="store.currentTenantOverview" />
        </div>
        
        <div class="space-y-6">
          <TenantRecentActivity 
            v-if="store.currentTenantActivity"
            :activity="store.currentTenantActivity.items" 
          />

          <!-- Health Reasons Box -->
          <div v-if="store.currentTenantHealth && store.currentTenantHealth.reasons.length > 0" 
               class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 class="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">Motivos de Atenção/Crítico</h4>
            <ul class="list-disc pl-4 space-y-1 text-sm text-yellow-700 dark:text-yellow-500">
              <li v-for="reason in store.currentTenantHealth.reasons" :key="reason.code">
                {{ reason.message }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
