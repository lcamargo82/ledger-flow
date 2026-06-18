import { httpClient } from './http-client';
import type { RolesResponse, RoleListItem } from '../types/admin.types';

export const rolesService = {
  async listRoles(): Promise<RolesResponse> {
    const { data } = await httpClient.get<RolesResponse>('/roles');
    return data;
  },

  async getRoleById(id: string): Promise<RoleListItem> {
    const { data } = await httpClient.get<RoleListItem>(`/roles/${id}`);
    return data;
  },
};
