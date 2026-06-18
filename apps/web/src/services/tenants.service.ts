import { httpClient } from './http-client';
import type { TenantResponse, UpdateTenantSettingsRequest } from '../types/admin.types';

export const tenantsService = {
  async getCurrentTenant(): Promise<TenantResponse> {
    const { data } = await httpClient.get<TenantResponse>('/tenants/current');
    return data;
  },

  async updateCurrentTenant(payload: UpdateTenantSettingsRequest): Promise<TenantResponse> {
    const { data } = await httpClient.patch<TenantResponse>('/tenants/current', payload);
    return data;
  },
};
