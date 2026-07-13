import { PaymentStatus } from '@prisma/client';

export class MercadoPagoStatusMapper {
  static toLedgerFlowStatus(status?: string | null): PaymentStatus | null {
    switch ((status ?? '').toLowerCase()) {
      case 'approved':
      case 'accredited':
        return PaymentStatus.APPROVED;
      case 'pending':
      case 'in_process':
        return PaymentStatus.PENDING;
      case 'rejected':
        return PaymentStatus.FAILED;
      case 'cancelled':
      case 'canceled':
        return PaymentStatus.CANCELED;
      case 'refunded':
        return PaymentStatus.REFUNDED;
      case 'charged_back':
      case 'chargeback':
        return null;
      default:
        return null;
    }
  }

  static isFinalStatus(status: PaymentStatus): boolean {
    return (
      status === PaymentStatus.APPROVED ||
      status === PaymentStatus.CANCELED ||
      status === PaymentStatus.REFUNDED ||
      status === PaymentStatus.FAILED
    );
  }

  static canTransition(current: PaymentStatus, target: PaymentStatus): boolean {
    if (current === target) return false;
    if (current === PaymentStatus.REFUNDED || current === PaymentStatus.CANCELED) return false;

    if (current === PaymentStatus.APPROVED) {
      return target === PaymentStatus.REFUNDED;
    }

    if (current === PaymentStatus.FAILED) {
      return false;
    }

    return true;
  }
}
