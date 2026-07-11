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
  <div class="lf-tenant-details">
    <AppPageHeader 
      :title="auditStore.tenantSupportSummary?.tenant.name || store.currentTenantOverview?.tenant.name || 'Detalhes do Tenant'"
      eyebrow="Plataforma"
    >
      <template #actions>
        <AppButton variant="secondary" @click="goBack">
          <span class="material-symbols-outlined lf-button__icon">arrow_back</span>
          Voltar
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Tabs -->
    <div class="lf-tabs-container lf-mb-6">
      <nav class="lf-tabs" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="lf-tab"
          :class="{ 'lf-tab--active': activeTab === tab.id }"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div class="lf-content-container">
      <div v-show="activeTab === 'overview'">
        <AppErrorState 
          v-if="store.error && !store.currentTenantOverview" 
          title="Error" 
          :description="store.error"
          @retry="store.fetchTenantOverview(tenantId)"
        />
        <div v-else-if="store.currentTenantOverview" class="lf-overview-layout">
          <div class="lf-overview-main">
            <TenantOverviewPanel :overview="store.currentTenantOverview" />
          </div>
          
          <div class="lf-overview-sidebar">
            <TenantRecentActivity 
              v-if="store.currentTenantActivity"
              :activity="store.currentTenantActivity.items" 
            />

            <!-- Health Reasons Box -->
            <div v-if="store.currentTenantHealth && store.currentTenantHealth.reasons.length > 0" 
                 class="lf-alert-box">
              <h4>Motivos de Atenção/Crítico</h4>
              <ul>
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

<style scoped>
.lf-tenant-details {
  display: flex;
  flex-direction: column;
}

.lf-tabs-container {
  border-bottom: 1px solid var(--lf-border-primary);
}

.lf-tabs {
  display: flex;
  gap: var(--lf-space-6);
  overflow-x: auto;
}

.lf-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: var(--lf-space-3) var(--lf-space-2);
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--lf-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;
  white-space: nowrap;
}

.lf-tab:hover {
  color: var(--lf-text-primary);
  border-bottom-color: var(--lf-border-secondary);
}

.lf-tab--active {
  color: var(--lf-primary);
  border-bottom-color: var(--lf-primary);
}

.lf-alert-box {
  background-color: var(--lf-warning-bg);
  border: 1px solid var(--lf-warning);
  border-radius: var(--lf-radius);
  padding: var(--lf-space-4);
}

.lf-alert-box h4 {
  margin: 0 0 var(--lf-space-2) 0;
  font-size: 0.875rem;
  color: var(--lf-warning);
}

.lf-alert-box ul {
  margin: 0;
  padding-left: var(--lf-space-4);
  font-size: 0.875rem;
  color: var(--lf-text-primary);
}

.lf-card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--lf-space-4);
}

.lf-card-header-flex h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-content-container {
  margin-top: var(--lf-space-6);
}

.lf-overview-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--lf-space-6);
}

@media (min-width: 1024px) {
  .lf-overview-layout {
    grid-template-columns: 2fr 1fr;
  }
}

.lf-overview-main,
.lf-overview-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-6);
}
</style>
