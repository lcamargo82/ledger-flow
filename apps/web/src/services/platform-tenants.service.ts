import { httpClient as api } from './http-client';
import type {
  ListPlatformTenantsQuery,
  PaginatedPlatformTenantsResponse,
  PlatformTenantDetailsResponse,
  PlatformTenantResponse,
  UpdatePlatformTenantDto,
  UpdatePlatformTenantStatusDto,
  UpdateTenantSubscriptionDto,
  CreatePlatformTenantDto,
  PlatformTenantProvisionResponse,
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

  async createTenant(dto: CreatePlatformTenantDto): Promise<PlatformTenantProvisionResponse> {
    const { data } = await api.post<PlatformTenantProvisionResponse>('/platform/tenants', dto);
    return data;
  }

  async resendTenantInvitation(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post<{ success: boolean; message: string }>(`/platform/tenants/${id}/invitation/resend`);
    return data;
  }
}

export const platformTenantsService = new PlatformTenantsService();
export default platformTenantsService;
