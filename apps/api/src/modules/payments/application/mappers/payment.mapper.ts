/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unused-vars */

export class PaymentMapper {
  static toPublic(payment: any) {
    if (!payment) return null;

    const {
      idempotencyKeyHash,
      idempotencyRequestHash,
      tenantId,
      providerPaymentId,
      ...publicData
    } = payment;

    return publicData;
  }

  static toPublicWithEvents(payment: any) {
    if (!payment) return null;

    const publicData = this.toPublic(payment);

    if (publicData.events) {
      publicData.events = publicData.events.map((event: any) => {
        const { tenantId, paymentId, ...publicEvent } = event;
        return publicEvent;
      });
    }

    return publicData;
  }
}
