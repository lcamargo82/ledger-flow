import {
  PaymentProvider,
  GatewayEnvironment,
  GatewayConfigurationStatus,
  GatewayHealthStatus,
} from '@prisma/client';

export class GatewayConfigurationSummaryDto {
  id: string;
  tenantId: string;
  provider: PaymentProvider;
  environment: GatewayEnvironment;
  status: GatewayConfigurationStatus;
  priority: number;
  displayName?: string | null;
  supportedMethods?: any;
  healthStatus: GatewayHealthStatus;
  lastHealthCheckAt?: Date | null;
  lastHealthCheckMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
