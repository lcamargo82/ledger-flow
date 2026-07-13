import { Injectable } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import * as crypto from 'crypto';
import {
  NormalizedWebhookEvent,
  ProviderWebhookPayloadInput,
} from '../../../domain/interfaces/provider-webhook-adapter.interface';
import { WebhookPayloadInvalidError } from '../../../domain/errors/webhook-errors';

@Injectable()
export class MercadoPagoWebhookNormalizer {
  async normalize(input: ProviderWebhookPayloadInput): Promise<NormalizedWebhookEvent> {
    const payload = input.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload !== 'object') {
      throw new WebhookPayloadInvalidError('Payload Mercado Pago inválido.');
    }

    const data = payload.data as Record<string, unknown> | undefined;
    const resourceId = data?.id;
    const resourceIdText =
      typeof resourceId === 'string' || typeof resourceId === 'number'
        ? String(resourceId)
        : undefined;

    const rawProviderEventType = this.eventType(payload);
    const providerEventId = this.providerEventId(payload, rawProviderEventType, resourceIdText);
    const merchantId = this.optionalString(payload.user_id);

    const payloadSummary = {
      providerEventId,
      eventType: rawProviderEventType,
      action: this.optionalString(payload.action),
      resourceId: resourceIdText,
      merchantId,
      liveMode: typeof payload.live_mode === 'boolean' ? payload.live_mode : undefined,
      apiVersion: this.optionalString(payload.api_version),
      dateCreated: this.optionalString(payload.date_created),
    };

    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payloadSummary))
      .digest('hex');

    return {
      provider: WebhookProvider.MERCADO_PAGO,
      providerEventId,
      eventType: rawProviderEventType,
      occurredAt: payloadSummary.dateCreated
        ? new Date(payloadSummary.dateCreated)
        : input.receivedAt,
      providerPaymentId: this.isPaymentEvent(rawProviderEventType) ? resourceIdText : undefined,
      providerStatus: payloadSummary.action,
      rawProviderEventType,
      payloadHash,
      payloadSummary,
      metadata: {
        merchantId,
        resourceId: resourceIdText,
        action: payloadSummary.action,
      },
      isInvalid: !resourceIdText,
      invalidReason: resourceIdText ? undefined : 'Payload Mercado Pago sem data.id',
    };
  }

  supportsEvent(eventType: string): boolean {
    return ['payment', 'order', 'topic_payment', 'claim', 'chargebacks'].some((supported) =>
      eventType.toLowerCase().includes(supported),
    );
  }

  private eventType(payload: Record<string, unknown>): string {
    const type = this.optionalString(payload.type);
    const topic = this.optionalString(payload.topic);
    const action = this.optionalString(payload.action);
    return type || topic || action || 'INVALID_EVENT_TYPE';
  }

  private providerEventId(
    payload: Record<string, unknown>,
    eventType: string,
    resourceId?: string,
  ): string {
    const id = this.optionalString(payload.id);
    if (id) return id;
    return `mp:${eventType}:${this.optionalString(payload.action) ?? 'unknown'}:${resourceId ?? this.hash(payload)}`;
  }

  private hash(payload: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24);
  }

  private isPaymentEvent(eventType: string): boolean {
    const lower = eventType.toLowerCase();
    return lower.includes('payment') || lower === 'topic_payment';
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  }
}
