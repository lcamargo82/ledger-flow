import { PaymentStatus } from '@prisma/client';

export class AsaasStatusMapper {
  static toLedgerFlowStatus(asaasStatus: string): PaymentStatus {
    switch (asaasStatus) {
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'RECEIVED':
      case 'CONFIRMED':
        return PaymentStatus.APPROVED;
      case 'OVERDUE':
        return PaymentStatus.FAILED;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      case 'REFUND_REQUESTED':
      case 'REFUND_IN_PROGRESS':
        return PaymentStatus.PROCESSING;
      default:
        // By default, fallback to PENDING or whatever fits unknown status
        return PaymentStatus.PENDING;
    }
  }
}
