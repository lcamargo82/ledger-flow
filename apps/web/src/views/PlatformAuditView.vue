<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '../composables/useI18n';
import { usePlatformAuditStore } from '../stores/platform-audit.store';
import AppPageHeader from '../components/common/AppPageHeader.vue';
import PlatformAuditFilters from '../components/platform/PlatformAuditFilters.vue';
import PlatformAuditTable from '../components/platform/PlatformAuditTable.vue';

import type { ListPlatformAuditLogsQuery } from '../types/platform-audit.types';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auditStore = usePlatformAuditStore();

const loadLogs = () => {
  const query: ListPlatformAuditLogsQuery = {
    page: Number(route.query.page) || 1,
    perPage: 20,
    search: route.query.search as string,
    tenantId: route.query.tenantId as string,
    action: route.query.action as string,
    severity: route.query.severity as any,
    actorType: route.query.actorType as any,
    source: route.query.source as string,
    dateFrom: route.query.dateFrom as string,
    dateTo: route.query.dateTo as string,
  };
  
  auditStore.fetchGlobalLogs(query);
};

const handleFilter = (filters: ListPlatformAuditLogsQuery) => {
  router.push({
    query: {
      ...route.query,
      ...filters,
      page: 1, // Reset page on filter
    }
  });
};

const handlePageChange = (page: number) => {
  router.push({ query: { ...route.query, page } });
};

watch(() => route.query, () => {
  loadLogs();
});

onMounted(() => {
  loadLogs();
});
</script>

<template>
  <div>
    <AppPageHeader
      :title="t('platform.audit.title')"
      :description="t('platform.audit.description')"
    />

    <div class="mt-6">
      <PlatformAuditFilters
        :initial-filters="{
          page: Number(route.query.page) || 1,
          search: route.query.search as string,
          tenantId: route.query.tenantId as string,
          action: route.query.action as string,
          severity: route.query.severity as any,
          actorType: route.query.actorType as any,
          source: route.query.source as string,
          dateFrom: route.query.dateFrom as string,
          dateTo: route.query.dateTo as string,
        }"
        @filter="handleFilter"
      />

      <div class="bg-white rounded-lg shadow-sm border border-slate-200">
        <PlatformAuditTable
          :logs="auditStore.auditLogs"
          :is-loading="auditStore.isLoading"
        />

        <!-- Pagination placeholder -->
        <div v-if="auditStore.meta.totalPages > 1" class="px-4 py-3 border-t border-slate-200 text-sm text-slate-500 text-center">
          Página {{ auditStore.meta.page }} de {{ auditStore.meta.totalPages }}
        </div>
      </div>
    </div>
  </div>
</template>
