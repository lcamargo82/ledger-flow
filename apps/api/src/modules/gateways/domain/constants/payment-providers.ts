import { PaymentProvider } from '@prisma/client';

export const SUPPORTED_PAYMENT_PROVIDERS: PaymentProvider[] = [
  PaymentProvider.STRIPE,
  PaymentProvider.ASAAS,
  PaymentProvider.MERCADO_PAGO,
  PaymentProvider.PAGBANK,
  PaymentProvider.PAGARME,
];
