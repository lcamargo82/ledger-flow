import { PaymentStatus } from '@prisma/client';
import { MercadoPagoStatusMapper } from './mercado-pago-status.mapper';

describe('MercadoPagoStatusMapper', () => {
  it('maps Mercado Pago statuses to LedgerFlow statuses', () => {
    expect(MercadoPagoStatusMapper.toLedgerFlowStatus('approved')).toBe(PaymentStatus.APPROVED);
    expect(MercadoPagoStatusMapper.toLedgerFlowStatus('accredited')).toBe(PaymentStatus.APPROVED);
    expect(MercadoPagoStatusMapper.toLedgerFlowStatus('pending')).toBe(PaymentStatus.PENDING);
    expect(MercadoPagoStatusMapper.toLedgerFlowStatus('in_process')).toBe(PaymentStatus.PENDING);
    expect(MercadoPagoStatusMapper.toLedgerFlowStatus('rejected')).toBe(PaymentStatus.FAILED);
    expect(MercadoPagoStatusMapper.toLedgerFlowStatus('cancelled')).toBe(PaymentStatus.CANCELED);
    expect(MercadoPagoStatusMapper.toLedgerFlowStatus('refunded')).toBe(PaymentStatus.REFUNDED);
    expect(MercadoPagoStatusMapper.toLedgerFlowStatus('charged_back')).toBeNull();
  });

  it('prevents terminal regressions while allowing approved refunds', () => {
    expect(
      MercadoPagoStatusMapper.canTransition(PaymentStatus.APPROVED, PaymentStatus.PENDING),
    ).toBe(false);
    expect(
      MercadoPagoStatusMapper.canTransition(PaymentStatus.APPROVED, PaymentStatus.REFUNDED),
    ).toBe(true);
    expect(
      MercadoPagoStatusMapper.canTransition(PaymentStatus.REFUNDED, PaymentStatus.APPROVED),
    ).toBe(false);
  });
});
