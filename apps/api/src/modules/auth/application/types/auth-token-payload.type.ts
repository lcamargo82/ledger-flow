export type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  tenantName: string;
  tenantKind: string;
  email: string;
  isPlatformAdmin: boolean;
  roles: string[];
  permissions: string[];
  sessionId?: string;
};
