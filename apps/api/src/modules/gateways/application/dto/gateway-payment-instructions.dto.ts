import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';

export class GatewayPaymentInstructions {
  provider: PaymentProvider;
  paymentId: string;
  providerPaymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  providerStatus?: string | null;
  dueDate?: Date | null;
  expiresAt?: Date | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pixCopyPaste?: string | null;
  pixQrCodeBase64?: string | null;
  paymentUrl?: string | null;
  isExpired: boolean;
  canCancel: boolean;
  canRefresh: boolean;
}
