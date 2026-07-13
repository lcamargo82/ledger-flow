import { GatewayEnvironment } from '@prisma/client';

export class RefundGatewayPaymentInput {
  tenantId: string;
  paymentId: string;
  providerPaymentId: string;
  gatewayConfigurationId: string;
  environment: GatewayEnvironment;
  credentials?: Record<string, string>;
  amount?: number; // if partial
  reason?: string;
  idempotencyKey?: string;
}
