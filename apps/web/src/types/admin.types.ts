export interface PermissionListItem {
  id: string;
  key: string;
  description?: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleListItem {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  description?: string;
  system: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantSettingsRequest {
  name?: string;
  timezone?: string;
}

export interface RolesResponse {
  data: RoleListItem[];
}

export interface PermissionsResponse {
  data: PermissionListItem[];
}

export interface TenantResponse {
  tenant: TenantSettings;
}
