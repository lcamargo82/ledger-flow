export type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
};
