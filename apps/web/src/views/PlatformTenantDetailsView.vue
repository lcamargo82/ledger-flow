<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '../composables/useI18n';
import { usePlatformTenantsStore } from '../stores/platform-tenants.store';
import { usePlatformAuditStore } from '../stores/platform-audit.store';
import AppPageHeader from '../components/common/AppPageHeader.vue';
import TenantSupportSummary from '../components/platform/TenantSupportSummary.vue';
import PlatformAuditTable from '../components/platform/PlatformAuditTable.vue';
import AppButton from '../components/common/AppButton.vue';
import AppCard from '../components/common/AppCard.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const tenantsStore = usePlatformTenantsStore();
const auditStore = usePlatformAuditStore();

const tenantId = route.params.id as string;
const activeTab = ref('overview');

const tabs = [
  { id: 'overview', name: t('platform.tenantDetails.tabs.overview') },
  { id: 'support', name: t('platform.tenantDetails.tabs.support') },
  { id: 'audit', name: t('platform.tenantDetails.tabs.audit') },
];

onMounted(async () => {
  // We simulate fetching tenant details since PlatformTenantsStore might not have a specific method for a single tenant yet
  // If we had a specific method, we would call it.
  auditStore.fetchTenantSupportSummary(tenantId);
  auditStore.fetchTenantLogs(tenantId, { page: 1, perPage: 5 });
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
    query: { tenantId }
  });
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center space-x-4 mb-2">
      <button @click="goBack" class="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="text-2xl font-bold text-slate-900">{{ auditStore.tenantSupportSummary?.tenant.name || 'Tenant Details' }}</h1>
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
        <AppCard>
          <p class="text-slate-500">{{ t('platform.tenantDetails.overviewEmpty') }}</p>
        </AppCard>
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
            <AppButton variant="secondary" size="sm" @click="viewFullAudit">
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
