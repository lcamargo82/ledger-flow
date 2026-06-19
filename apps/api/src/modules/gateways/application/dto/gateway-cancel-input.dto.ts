import { GatewayEnvironment } from '@prisma/client';

export class CancelGatewayPaymentInput {
  tenantId: string;
  paymentId: string;
  providerPaymentId: string;
  gatewayConfigurationId: string;
  environment: GatewayEnvironment;
  credentials?: Record<string, string>;
  reason?: string;
}
