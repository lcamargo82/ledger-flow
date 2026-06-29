import { httpClient as api } from './http-client';
import type {
  PaginatedPlatformAuditLogResponse,
  PlatformTenantSupportSummary,
  ListPlatformAuditLogsQuery,
} from '../types/platform-audit.types';

export const platformAuditService = {
  async listGlobalAuditLogs(query: ListPlatformAuditLogsQuery): Promise<PaginatedPlatformAuditLogResponse> {
    const { data } = await api.get<PaginatedPlatformAuditLogResponse>('/platform/audit-logs', { params: query });
    return data;
  },

  async listTenantAuditLogs(tenantId: string, query: ListPlatformAuditLogsQuery): Promise<PaginatedPlatformAuditLogResponse> {
    const { data } = await api.get<PaginatedPlatformAuditLogResponse>(`/platform/tenants/${tenantId}/audit-logs`, { params: query });
    return data;
  },

  async getTenantSupportSummary(tenantId: string): Promise<PlatformTenantSupportSummary> {
    const { data } = await api.get<PlatformTenantSupportSummary>(`/platform/tenants/${tenantId}/support-summary`);
    return data;
  },
};
