<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '../composables/useI18n';
import { usePlatformTenantsStore } from '../stores/platform-tenants.store';
import { usePlatformAuditStore } from '../stores/platform-audit.store';

import AppPageHeader from '../components/common/AppPageHeader.vue';
import AppButton from '../components/common/AppButton.vue';
import AppBadge from '../components/common/AppBadge.vue';
import AppCard from '../components/common/AppCard.vue';
import AppErrorState from '../components/common/AppErrorState.vue';

import TenantHealthBadge from '../components/platform/TenantHealthBadge.vue';
import TenantOverviewPanel from '../components/platform/TenantOverviewPanel.vue';
import TenantRecentActivity from '../components/platform/TenantRecentActivity.vue';
import TenantSupportSummary from '../components/platform/TenantSupportSummary.vue';
import PlatformAuditTable from '../components/platform/PlatformAuditTable.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const store = usePlatformTenantsStore();
const auditStore = usePlatformAuditStore();

const tenantId = computed(() => route.params.id as string);
const activeTab = ref('overview');

const tabs = [
  { id: 'overview', name: t('platform.tenantDetails.tabs.overview') },
  { id: 'support', name: t('platform.tenantDetails.tabs.support') },
  { id: 'audit', name: t('platform.tenantDetails.tabs.audit') },
];

onMounted(async () => {
  if (tenantId.value) {
    await store.fetchTenantOverview(tenantId.value);
    auditStore.fetchTenantSupportSummary(tenantId.value);
    auditStore.fetchTenantLogs(tenantId.value, { page: 1, perPage: 5 });
  }
});

onUnmounted(() => {
  auditStore.tenantSupportSummary = null;
  auditStore.auditLogs = [];
});

const goBack = () => {
  router.push('/platform/tenants');
};

const viewFullAudit = () => {
  router.push({
    name: 'PlatformAudit',
    query: { tenantId: tenantId.value }
  });
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center space-x-4 mb-2">
      <button @click="goBack" class="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="text-2xl font-bold text-slate-900">{{ auditStore.tenantSupportSummary?.tenant.name || store.currentTenantOverview?.tenant.name || 'Tenant Details' }}</h1>
    </div>

    <!-- Tabs -->
    <div class="border-b border-slate-200">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            activeTab === tab.id
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div class="mt-6">
      <div v-show="activeTab === 'overview'">
        <AppErrorState 
          v-if="store.error && !store.currentTenantOverview" 
          title="Error" 
          :description="store.error"
          @retry="store.fetchTenantOverview(tenantId)"
        />
        <div v-else-if="store.currentTenantOverview" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      </div>

      <div v-show="activeTab === 'support'">
        <div v-if="auditStore.isSummaryLoading" class="p-8 text-center text-slate-500">
          Loading support summary...
        </div>
        <div v-else-if="auditStore.summaryError" class="p-8 text-center text-red-500">
          {{ auditStore.summaryError }}
        </div>
        <TenantSupportSummary 
          v-else-if="auditStore.tenantSupportSummary"
          :summary="auditStore.tenantSupportSummary" 
        />
      </div>

      <div v-show="activeTab === 'audit'">
        <AppCard>
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-slate-900">{{ t('platform.tenantDetails.recentAudit') }}</h3>
            <AppButton variant="secondary" size="small" @click="viewFullAudit">
              {{ t('platform.audit.actions.viewAllTenantLogs') }}
            </AppButton>
          </div>
          
          <PlatformAuditTable 
            :logs="auditStore.auditLogs"
            :is-loading="auditStore.isLoading"
          />
        </AppCard>
      </div>
    </div>
  </div>
</template>
