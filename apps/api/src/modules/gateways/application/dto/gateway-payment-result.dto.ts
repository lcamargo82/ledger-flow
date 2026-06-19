import { PaymentProvider, PaymentStatus } from '@prisma/client';

export class GatewayPaymentResult {
  provider: PaymentProvider;
  providerPaymentId: string;
  providerStatus: string;
  normalizedStatus: PaymentStatus;
  checkoutUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate?: Date;
  expiresAt?: Date;
  rawResponseReference?: string;
  metadata?: Record<string, any>;
}
