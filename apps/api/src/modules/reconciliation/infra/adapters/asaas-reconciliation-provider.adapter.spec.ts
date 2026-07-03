import { WebhookProvider } from '@prisma/client';
import { AsaasReconciliationProviderAdapter } from './asaas-reconciliation-provider.adapter';
import { NormalizedWebhookEvent } from '../../../webhooks/domain/interfaces/provider-webhook-adapter.interface';

describe('AsaasReconciliationProviderAdapter', () => {
  const adapter = new AsaasReconciliationProviderAdapter();

  it('normalizes Asaas webhook amounts into BRL minor units', () => {
    const event: NormalizedWebhookEvent = {
      provider: WebhookProvider.ASAAS,
      providerEventId: 'evt_123',
      eventType: 'PAYMENT_RECEIVED',
      rawProviderEventType: 'PAYMENT_RECEIVED',
      providerPaymentId: 'pay_123',
      paymentReference: 'LF-123',
      providerStatus: 'RECEIVED',
      amountInCents: 12345,
      currency: 'BRL',
      occurredAt: new Date('2026-07-03T10:00:00.000Z'),
      payloadHash: 'hash-123',
      payloadSummary: {
        eventId: 'evt_123',
        eventType: 'PAYMENT_RECEIVED',
        providerPaymentId: 'pay_123',
        externalReference: 'LF-123',
        providerStatus: 'RECEIVED',
        value: 123.45,
        eventDate: '2026-07-03T10:00:00.000Z',
      },
    };

    const normalized = adapter.normalizeWebhook(event);

    expect(normalized).toEqual({
      provider: WebhookProvider.ASAAS,
      providerEventId: 'evt_123',
      providerSettlementId: undefined,
      providerPaymentId: 'pay_123',
      externalReference: 'LF-123',
      eventType: 'PAYMENT_RECEIVED',
      providerStatus: 'RECEIVED',
      amountMinor: '12345',
      feeAmountMinor: undefined,
      netAmountMinor: undefined,
      currency: 'BRL',
      currencyExponent: 2,
      occurredAt: new Date('2026-07-03T10:00:00.000Z'),
      availableAt: undefined,
      payloadHash: 'hash-123',
      normalizedPayload: {
        eventId: 'evt_123',
        eventType: 'PAYMENT_RECEIVED',
        providerPaymentId: 'pay_123',
        externalReference: 'LF-123',
        providerStatus: 'RECEIVED',
        value: '123.45',
        eventDate: '2026-07-03T10:00:00.000Z',
      },
    });
  });

  it('returns null when the webhook has no financial reference', () => {
    const event: NormalizedWebhookEvent = {
      provider: WebhookProvider.ASAAS,
      providerEventId: 'evt_ignored',
      eventType: 'UNKNOWN',
      rawProviderEventType: 'UNKNOWN',
      payloadHash: 'hash-ignored',
      payloadSummary: {},
    };

    expect(adapter.normalizeWebhook(event)).toBeNull();
  });

  it('redacts sensitive provider fields from the normalized payload', () => {
    const event: NormalizedWebhookEvent = {
      provider: WebhookProvider.ASAAS,
      providerEventId: 'evt_sensitive',
      eventType: 'PAYMENT_RECEIVED',
      rawProviderEventType: 'PAYMENT_RECEIVED',
      providerPaymentId: 'pay_sensitive',
      paymentReference: 'LF-SENSITIVE',
      providerStatus: 'RECEIVED',
      amountInCents: 9900,
      currency: 'BRL',
      occurredAt: new Date('2026-07-03T10:00:00.000Z'),
      payloadHash: 'hash-sensitive',
      payloadSummary: {
        eventId: 'evt_sensitive',
        eventType: 'PAYMENT_RECEIVED',
        providerPaymentId: 'pay_sensitive',
        externalReference: 'LF-SENSITIVE',
        providerStatus: 'RECEIVED',
        value: 99,
        customer: {
          name: 'Cliente Teste',
          email: 'cliente@example.test',
        },
        creditCard: {
          token: 'card-token',
          lastDigits: '4242',
        },
        accessToken: 'asaas-secret-token',
        authorization: 'Bearer secret',
      },
    };

    const normalized = adapter.normalizeWebhook(event);

    expect(normalized?.normalizedPayload).toEqual({
      eventId: 'evt_sensitive',
      eventType: 'PAYMENT_RECEIVED',
      providerPaymentId: 'pay_sensitive',
      externalReference: 'LF-SENSITIVE',
      providerStatus: 'RECEIVED',
      value: '99',
      redactedFields: ['accessToken', 'authorization', 'creditCard', 'customer'],
    });
  });
});
