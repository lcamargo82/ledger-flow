import { Injectable } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import { createHash } from 'crypto';
import { NormalizedSettlementEvent } from '../../../reconciliation/domain/interfaces/reconciliation-provider-adapter.interface';
import { MercadoPagoApiClient } from '../../../gateways/infra/providers/mercado-pago/mercado-pago-api.client';
import {
  MercadoPagoPaymentResponse,
  MercadoPagoRefundResponse,
} from '../../../gateways/infra/providers/mercado-pago/mercado-pago.types';

interface ReadInput {
  accessToken: string;
  gatewayConfigurationId: string;
  operationalFinancialAccountId: string;
  from: Date;
  to: Date;
  offset?: number;
  limit?: number;
}

interface ReadPage {
  data: NormalizedSettlementEvent[];
  nextOffset?: number;
}

@Injectable()
export class MercadoPagoFinancialReadService {
  constructor(private readonly apiClient: MercadoPagoApiClient) {}

  async fetchPaymentEvents(input: ReadInput): Promise<ReadPage> {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const response = await this.apiClient.searchPayments(input.accessToken, {
      from: input.from,
      to: input.to,
      offset,
      limit,
      sort: 'date_created',
      criteria: 'asc',
    });

    const data = (response.results ?? []).map((payment) =>
      this.normalizePayment(payment, {
        gatewayConfigurationId: input.gatewayConfigurationId,
        operationalFinancialAccountId: input.operationalFinancialAccountId,
      }),
    );

    const total = response.paging?.total ?? offset + data.length;
    const nextOffset = offset + limit < total ? offset + limit : undefined;

    return { data, nextOffset };
  }

  private normalizePayment(
    payment: MercadoPagoPaymentResponse,
    context: { gatewayConfigurationId: string; operationalFinancialAccountId: string },
  ): NormalizedSettlementEvent {
    const amountMinor = this.moneyToMinor(payment.transaction_amount);
    const feeAmountMinor = this.moneyToMinor(this.sumFees(payment));
    const netAmountMinor = this.moneyToMinor(this.resolveNetAmount(payment));
    const normalizedPayload = this.sanitizePayment(payment, {
      grossAmountMinor: amountMinor,
      feeAmountMinor,
      netAmountMinor,
    });

    return {
      provider: WebhookProvider.MERCADO_PAGO,
      operationalFinancialAccountId: context.operationalFinancialAccountId,
      providerEventId: `mp-payment:${context.gatewayConfigurationId}:${payment.id}`,
      providerPaymentId: String(payment.id),
      externalReference: payment.external_reference,
      eventType: this.resolveEventType(payment),
      providerStatus: payment.status,
      amountMinor,
      feeAmountMinor,
      netAmountMinor,
      currency: payment.currency_id || 'BRL',
      currencyExponent: 2,
      occurredAt: this.parseDate(
        payment.date_approved || payment.date_created || payment.date_last_updated,
      ),
      availableAt: this.parseDate(payment.money_release_date),
      payloadHash: this.hash(normalizedPayload),
      normalizedPayload,
    };
  }

  private resolveEventType(payment: MercadoPagoPaymentResponse) {
    if ((payment.refunds ?? []).length > 0) return 'payment_refunded';
    if (payment.status === 'charged_back') return 'payment_chargeback';
    return 'payment';
  }

  private sumFees(payment: MercadoPagoPaymentResponse) {
    return (payment.fee_details ?? []).reduce((sum, fee) => sum + Number(fee.amount ?? 0), 0);
  }

  private resolveNetAmount(payment: MercadoPagoPaymentResponse) {
    const providerNet = payment.transaction_details?.net_received_amount;
    if (typeof providerNet === 'number') return providerNet;
    return Number(payment.transaction_amount ?? 0) - this.sumFees(payment);
  }

  private sanitizePayment(
    payment: MercadoPagoPaymentResponse,
    totals: { grossAmountMinor?: string; feeAmountMinor?: string; netAmountMinor?: string },
  ): Record<string, unknown> {
    return {
      source: 'mercado_pago_payments_search',
      providerPaymentId: String(payment.id),
      status: payment.status,
      statusDetail: payment.status_detail,
      paymentMethodId: payment.payment_method_id,
      externalReference: payment.external_reference,
      currency: payment.currency_id || 'BRL',
      grossAmountMinor: totals.grossAmountMinor,
      feeAmountMinor: totals.feeAmountMinor,
      netAmountMinor: totals.netAmountMinor,
      dateCreated: payment.date_created,
      dateApproved: payment.date_approved,
      dateLastUpdated: payment.date_last_updated,
      moneyReleaseDate: payment.money_release_date,
      refunds: this.sanitizeRefunds(payment.refunds),
      feeTypes: (payment.fee_details ?? []).map((fee) => ({
        type: fee.type,
        feePayer: fee.fee_payer,
        amountMinor: this.moneyToMinor(fee.amount),
      })),
      chargeDetailTypes: (payment.charges_details ?? []).map((charge) => ({
        id: charge.id,
        name: charge.name,
        type: charge.type,
      })),
    };
  }

  private sanitizeRefunds(refunds?: MercadoPagoRefundResponse[]) {
    return (refunds ?? []).map((refund) => ({
      id: refund.id ? String(refund.id) : undefined,
      paymentId: refund.payment_id ? String(refund.payment_id) : undefined,
      status: refund.status,
      amountMinor: this.moneyToMinor(refund.amount),
      dateCreated: refund.date_created,
    }));
  }

  private moneyToMinor(value: number | undefined) {
    if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
    return String(Math.round(value * 100));
  }

  private parseDate(value?: string) {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private hash(payload: Record<string, unknown>) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
