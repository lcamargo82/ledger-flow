import { PaymentStatus } from '@prisma/client';
import { ASAAS_PAYMENT_EVENTS } from '../../domain/constants/asaas-payment-events';

export class AsaasWebhookStatusMapper {
  static toLedgerFlowStatus(asaasEvent: string): PaymentStatus | null {
    switch (asaasEvent) {
      case ASAAS_PAYMENT_EVENTS.PAYMENT_CONFIRMED:
      case ASAAS_PAYMENT_EVENTS.PAYMENT_RECEIVED:
        return PaymentStatus.APPROVED;
      case ASAAS_PAYMENT_EVENTS.PAYMENT_OVERDUE:
        return PaymentStatus.FAILED;
      case ASAAS_PAYMENT_EVENTS.PAYMENT_REFUNDED:
        return PaymentStatus.REFUNDED;
      case ASAAS_PAYMENT_EVENTS.PAYMENT_DELETED:
        return PaymentStatus.CANCELED;
      case ASAAS_PAYMENT_EVENTS.PAYMENT_CREATED:
      case ASAAS_PAYMENT_EVENTS.PAYMENT_UPDATED:
        // No strict local status mapping since we keep current status or wait for terminal events
        return null;
      default:
        return null;
    }
  }

  static isTerminalStatus(status: PaymentStatus): boolean {
    return (
      status === PaymentStatus.REFUNDED || status === PaymentStatus.CANCELED
    );
  }
}
