import { defineStore } from 'pinia';
import { ref } from 'vue';
import { platformAuditService } from '../services/platform-audit.service';
import type {
  PlatformAuditLogResponse,
  PlatformTenantSupportSummary,
  ListPlatformAuditLogsQuery,
} from '../types/platform-audit.types';

export const usePlatformAuditStore = defineStore('platformAudit', () => {
  const auditLogs = ref<PlatformAuditLogResponse[]>([]);
  const meta = ref({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const tenantSupportSummary = ref<PlatformTenantSupportSummary | null>(null);
  const isSummaryLoading = ref(false);
  const summaryError = ref<string | null>(null);

  async function fetchGlobalLogs(query: ListPlatformAuditLogsQuery) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await platformAuditService.listGlobalAuditLogs(query);
      auditLogs.value = response.data;
      meta.value = response.meta;
    } catch (e: any) {
      error.value = e.message || 'Error fetching global audit logs';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchTenantLogs(tenantId: string, query: ListPlatformAuditLogsQuery) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await platformAuditService.listTenantAuditLogs(tenantId, query);
      auditLogs.value = response.data;
      meta.value = response.meta;
    } catch (e: any) {
      error.value = e.message || 'Error fetching tenant audit logs';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchTenantSupportSummary(tenantId: string) {
    isSummaryLoading.value = true;
    summaryError.value = null;
    try {
      tenantSupportSummary.value = await platformAuditService.getTenantSupportSummary(tenantId);
    } catch (e: any) {
      summaryError.value = e.message || 'Error fetching tenant support summary';
    } finally {
      isSummaryLoading.value = false;
    }
  }

  return {
    auditLogs,
    meta,
    isLoading,
    error,
    tenantSupportSummary,
    isSummaryLoading,
    summaryError,
    fetchGlobalLogs,
    fetchTenantLogs,
    fetchTenantSupportSummary,
  };
});
