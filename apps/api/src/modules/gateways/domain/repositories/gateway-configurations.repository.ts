import {
  GatewayConfiguration,
  GatewayEnvironment,
  GatewayConfigurationStatus,
  PaymentProvider,
} from '@prisma/client';

export abstract class GatewayConfigurationsRepository {
  abstract findByIdAndTenant(id: string, tenantId: string): Promise<GatewayConfiguration | null>;

  abstract findActiveByTenantAndProvider(
    tenantId: string,
    provider: PaymentProvider,
    environment?: GatewayEnvironment,
  ): Promise<GatewayConfiguration | null>;

  abstract findDefaultActiveByTenant(
    tenantId: string,
    environment?: GatewayEnvironment,
  ): Promise<GatewayConfiguration | null>;

  abstract findByTenant(tenantId: string): Promise<GatewayConfiguration[]>;

  abstract create(data: {
    tenantId: string;
    provider: PaymentProvider;
    environment: GatewayEnvironment;
    status?: GatewayConfigurationStatus;
    priority?: number;
    displayName?: string;
    supportedMethods?: any;
    encryptedCredentials?: string;
    credentialsFingerprint?: string;
  }): Promise<GatewayConfiguration>;

  abstract updateStatus(
    id: string,
    tenantId: string,
    status: GatewayConfigurationStatus,
  ): Promise<GatewayConfiguration>;
}
