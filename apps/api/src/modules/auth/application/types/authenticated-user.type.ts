export type AuthenticatedUser = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantKind: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  roles: string[];
  permissions: string[];
  sessionId?: string;
};
