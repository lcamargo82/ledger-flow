/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import * as crypto from 'crypto';
import {
  NormalizedWebhookEvent,
  ProviderWebhookPayloadInput,
} from '../../../domain/interfaces/provider-webhook-adapter.interface';
import { ProviderWebhookNormalizer } from '../../../domain/interfaces/provider-webhook-normalizer.interface';
import { AsaasWebhookStatusMapper } from '../../../application/mappers/asaas-webhook-status.mapper';
import { WebhookPayloadInvalidError } from '../../../domain/errors/webhook-errors';

@Injectable()
export class AsaasWebhookNormalizer implements ProviderWebhookNormalizer {
  async normalize(input: ProviderWebhookPayloadInput): Promise<NormalizedWebhookEvent> {
    const { payload, receivedAt } = input;

    if (!payload || !payload.id) {
      throw new WebhookPayloadInvalidError('Payload Asaas sem id.');
    }

    const providerEventId = payload.id;
    const rawProviderEventType = payload.event || 'INVALID_EVENT_TYPE';
    let isInvalid = false;
    let invalidReason: string | undefined = undefined;

    if (!payload.event) {
      isInvalid = true;
      invalidReason = 'Payload Asaas sem event type';
    }

    // Normalize status
    const normalizedPaymentStatus =
      AsaasWebhookStatusMapper.toLedgerFlowStatus(rawProviderEventType);

    // Convert decimal value to cents
    let amountInCents: number | undefined;
    if (payload.payment?.value !== undefined && payload.payment?.value !== null) {
      amountInCents = Math.round(Number(payload.payment.value) * 100);
    }

    const payloadSummary = {
      eventId: providerEventId,
      eventType: rawProviderEventType,
      providerPaymentId: payload.payment?.id,
      externalReference: payload.payment?.externalReference,
      providerStatus: payload.payment?.status,
      billingType: payload.payment?.billingType,
      value: payload.payment?.value,
      eventDate: payload.dateCreated,
    };

    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payloadSummary))
      .digest('hex');

    return {
      provider: WebhookProvider.ASAAS,
      providerEventId,
      eventType: rawProviderEventType,
      occurredAt: payload.dateCreated ? new Date(payload.dateCreated) : receivedAt,
      providerPaymentId: payload.payment?.id,
      paymentReference: payload.payment?.externalReference,
      providerStatus: payload.payment?.status,
      normalizedPaymentStatus: normalizedPaymentStatus ?? undefined,
      billingType: payload.payment?.billingType,
      amountInCents,
      currency: 'BRL', // Asaas is BR only usually
      payloadHash,
      payloadSummary,
      rawProviderEventType,
      isInvalid,
      invalidReason,
    };
  }
}
