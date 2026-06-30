import { PaymentStatus } from '@prisma/client';

export function canTransitionPaymentStatus(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) return false;

  const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.PENDING]: [
      PaymentStatus.PROCESSING,
      PaymentStatus.CANCELED,
      PaymentStatus.FAILED,
    ],
    [PaymentStatus.PROCESSING]: [
      PaymentStatus.APPROVED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELED,
    ],
    [PaymentStatus.APPROVED]: [PaymentStatus.REFUNDED],
    [PaymentStatus.FAILED]: [],
    [PaymentStatus.CANCELED]: [],
    [PaymentStatus.REFUNDED]: [],
  };

  return validTransitions[from].includes(to);
}
