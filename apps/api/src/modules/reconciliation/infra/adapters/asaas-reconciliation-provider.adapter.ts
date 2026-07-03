import { Injectable } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import { NormalizedWebhookEvent } from '../../../webhooks/domain/interfaces/provider-webhook-adapter.interface';
import {
  NormalizedSettlementEvent,
  ProviderSettlementPage,
  ReconciliationProviderAdapter,
  SyncInput,
} from '../../domain/interfaces/reconciliation-provider-adapter.interface';
import { Money } from '../../domain/value-objects/money';

@Injectable()
export class AsaasReconciliationProviderAdapter implements ReconciliationProviderAdapter {
  readonly provider = WebhookProvider.ASAAS;

  normalizeWebhook(input: unknown): NormalizedSettlementEvent | null {
    const event = input as NormalizedWebhookEvent;
    if (
      event.provider !== WebhookProvider.ASAAS ||
      (!event.providerPaymentId && !event.paymentReference && !event.amountInCents)
    ) {
      return null;
    }

    const currency = event.currency ?? 'BRL';
    const money = this.resolveAmount(event, currency);

    return {
      provider: WebhookProvider.ASAAS,
      providerEventId: event.providerEventId,
      providerSettlementId: undefined,
      providerPaymentId: event.providerPaymentId,
      externalReference: event.paymentReference,
      eventType: event.rawProviderEventType || event.eventType,
      providerStatus: event.providerStatus,
      amountMinor: money?.amountMinor,
      feeAmountMinor: undefined,
      netAmountMinor: undefined,
      currency: money?.currency ?? currency,
      currencyExponent: money?.exponent ?? Money.fromMinor(0, currency).exponent,
      occurredAt: event.occurredAt,
      availableAt: undefined,
      payloadHash: event.payloadHash,
      normalizedPayload: this.sanitizePayload(event),
    };
  }

  fetchSettlements(input: SyncInput): Promise<ProviderSettlementPage> {
    void input;
    return Promise.resolve({ data: [] });
  }

  supportsSettlementSync(): boolean {
    return false;
  }

  private resolveAmount(event: NormalizedWebhookEvent, currency: string) {
    if (event.amountInCents !== undefined) {
      return Money.fromMinor(event.amountInCents, currency);
    }

    const value = event.payloadSummary?.value as unknown;
    if (typeof value === 'string' || typeof value === 'number') {
      return Money.fromDecimalString(value, currency);
    }

    return undefined;
  }

  private sanitizePayload(
    event: NormalizedWebhookEvent,
  ): Record<string, unknown> {
    const summary = (event.payloadSummary ?? {}) as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {
      ...(this.asString(summary.eventId) && {
        eventId: this.asString(summary.eventId),
      }),
      ...(this.asString(summary.eventType) && {
        eventType: this.asString(summary.eventType),
      }),
      ...(this.asString(summary.providerPaymentId) && {
        providerPaymentId: this.asString(summary.providerPaymentId),
      }),
      ...(this.asString(summary.externalReference) && {
        externalReference: this.asString(summary.externalReference),
      }),
      ...(this.asString(summary.providerStatus) && {
        providerStatus: this.asString(summary.providerStatus),
      }),
      ...(this.asString(summary.value) && {
        value: this.asString(summary.value),
      }),
      ...(this.asString(summary.eventDate) && {
        eventDate: this.asString(summary.eventDate),
      }),
    };
    const redactedFields = this.findRedactedFields(summary);

    if (redactedFields.length > 0) {
      sanitized.redactedFields = redactedFields;
    }

    return sanitized;
  }

  private findRedactedFields(summary: Record<string, unknown>) {
    const sensitiveKeys = new Set([
      'accessToken',
      'apiKey',
      'authorization',
      'billingAddress',
      'creditCard',
      'customer',
      'token',
      'webhookSecret',
    ]);

    return Object.keys(summary)
      .filter((key) => sensitiveKeys.has(key))
      .sort();
  }

  private asString(value: unknown) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return undefined;
  }
}
