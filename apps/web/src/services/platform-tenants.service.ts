import { httpClient as api } from './http-client';
import type {
  ListPlatformTenantsQuery,
  PaginatedPlatformTenantsResponse,
  PlatformTenantDetailsResponse,
  PlatformTenantResponse,
  UpdatePlatformTenantDto,
  UpdatePlatformTenantStatusDto,
  UpdateTenantSubscriptionDto,
  PlatformTenantOverviewResponse,
  PlatformTenantHealthResponse,
  PlatformTenantActivityResponse
} from '../types/platform.types';

class PlatformTenantsService {
  async findAll(query?: ListPlatformTenantsQuery): Promise<PaginatedPlatformTenantsResponse> {
    const { data } = await api.get<PaginatedPlatformTenantsResponse>('/platform/tenants', { params: query });
    return data;
  }

  async findOne(id: string): Promise<PlatformTenantDetailsResponse> {
    const { data } = await api.get<PlatformTenantDetailsResponse>(`/platform/tenants/${id}`);
    return data;
  }

  async update(id: string, dto: UpdatePlatformTenantDto): Promise<PlatformTenantResponse> {
    const { data } = await api.patch<PlatformTenantResponse>(`/platform/tenants/${id}`, dto);
    return data;
  }

  async updateStatus(id: string, dto: UpdatePlatformTenantStatusDto): Promise<PlatformTenantResponse> {
    const { data } = await api.patch<PlatformTenantResponse>(`/platform/tenants/${id}/status`, dto);
    return data;
  }

  async updateSubscription(id: string, dto: UpdateTenantSubscriptionDto): Promise<PlatformTenantDetailsResponse> {
    const { data } = await api.patch<PlatformTenantDetailsResponse>(`/platform/tenants/${id}/subscription`, dto);
    return data;
  }

  async getTenantOverview(id: string): Promise<PlatformTenantOverviewResponse> {
    const { data } = await api.get<PlatformTenantOverviewResponse>(`/platform/tenants/${id}/overview`);
    return data;
  }

  async getTenantHealth(id: string): Promise<PlatformTenantHealthResponse> {
    const { data } = await api.get<PlatformTenantHealthResponse>(`/platform/tenants/${id}/health`);
    return data;
  }

  async getTenantActivity(id: string): Promise<PlatformTenantActivityResponse> {
    const { data } = await api.get<PlatformTenantActivityResponse>(`/platform/tenants/${id}/activity`);
    return data;
  }
}

export const platformTenantsService = new PlatformTenantsService();
export default platformTenantsService;
