export type AuthenticatedUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
};
