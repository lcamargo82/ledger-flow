import { httpClient } from './http-client';
import type { PermissionsResponse } from '../types/admin.types';

export const permissionsService = {
  async listPermissions(): Promise<PermissionsResponse> {
    const { data } = await httpClient.get<PermissionsResponse>('/permissions');
    return data;
  },
};
