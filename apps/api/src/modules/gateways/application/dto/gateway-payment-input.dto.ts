import { PaymentMethod, GatewayEnvironment } from '@prisma/client';

export class CreateGatewayPaymentInput {
  tenantId: string;
  paymentId: string;
  paymentReference: string;
  amount: number; // in cents
  currency: string;
  method: PaymentMethod;
  customer: {
    id: string;
    name: string;
    email?: string | null;
    document?: string | null;
  };
  description?: string | null;
  dueDate?: Date | null;
  idempotencyKey?: string;
  gatewayConfigurationId: string;
  providerCustomerId?: string;
  credentials?: Record<string, string>;
  environment: GatewayEnvironment;
}

export class GetGatewayPaymentInput {
  tenantId: string;
  paymentId: string;
  providerPaymentId: string;
  gatewayConfigurationId: string;
  environment: GatewayEnvironment;
}

export class GetGatewayPaymentInstructionsInput {
  tenantId: string;
  paymentId: string;
  providerPaymentId: string;
  method: PaymentMethod;
  credentials?: Record<string, string>;
  environment: GatewayEnvironment;
}
