import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ProviderSettlementEvent,
  WebhookInboxEvent,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { NormalizedWebhookEvent } from '../../../webhooks/domain/interfaces/provider-webhook-adapter.interface';
import { AsaasReconciliationProviderAdapter } from '../../infra/adapters/asaas-reconciliation-provider.adapter';
import { NormalizedSettlementEvent } from '../../domain/interfaces/reconciliation-provider-adapter.interface';

interface IngestionResult {
  settlementEvent: ProviderSettlementEvent | null;
  created: boolean;
}

@Injectable()
export class ReconciliationSettlementIngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaasAdapter: AsaasReconciliationProviderAdapter,
  ) {}

  async ingestAsaasWebhookInbox(inboxEvent: WebhookInboxEvent): Promise<IngestionResult> {
    const normalized = this.asaasAdapter.normalizeWebhook(
      this.toNormalizedWebhookEvent(inboxEvent),
    );

    if (!normalized) {
      return { settlementEvent: null, created: false };
    }

    return this.ingestNormalizedSettlement(
      inboxEvent.tenantId,
      normalized,
      inboxEvent.id,
      inboxEvent.receivedAt,
    );
  }

  async ingestNormalizedSettlement(
    tenantId: string | null,
    normalized: NormalizedSettlementEvent,
    sourceWebhookInboxEventId?: string,
    receivedAt = new Date(),
  ): Promise<IngestionResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.providerSettlementEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: normalized.provider,
            providerEventId: normalized.providerEventId,
          },
        },
      });

      if (existing) {
        return { settlementEvent: existing, created: false };
      }

      const settlementEvent = await tx.providerSettlementEvent.create({
        data: this.toCreateInput(
          normalized,
          tenantId,
          sourceWebhookInboxEventId,
          receivedAt,
        ),
      });

      const outboxPayload = {
        providerSettlementEventId: settlementEvent.id,
        provider: settlementEvent.provider,
        providerEventId: settlementEvent.providerEventId,
        providerPaymentId: settlementEvent.providerPaymentId,
        externalReference: settlementEvent.externalReference,
      };

      await tx.outboxEvent.create({
        data: {
          tenantId: settlementEvent.tenantId,
          aggregateType: 'ProviderSettlementEvent',
          aggregateId: settlementEvent.id,
          eventType: 'reconciliation.settlement_received',
          eventVersion: 1,
          payload: outboxPayload,
          payloadHash: this.hash(outboxPayload),
        },
      });

      return { settlementEvent, created: true };
    });
  }

  private toNormalizedWebhookEvent(inboxEvent: WebhookInboxEvent): NormalizedWebhookEvent {
    const payloadSummary = (inboxEvent.payloadSummary as Record<string, unknown>) ?? {};

    return {
      provider: inboxEvent.provider,
      providerEventId: inboxEvent.providerEventId,
      eventType: inboxEvent.eventType,
      rawProviderEventType: inboxEvent.eventType,
      providerPaymentId: inboxEvent.providerPaymentId ?? undefined,
      paymentReference: inboxEvent.externalReference ?? undefined,
      providerStatus: inboxEvent.providerPaymentStatus ?? undefined,
      amountInCents: this.resolveAmountInCents(payloadSummary),
      currency: 'BRL',
      occurredAt: this.resolveOccurredAt(payloadSummary, inboxEvent.receivedAt),
      payloadHash: inboxEvent.payloadHash,
      payloadSummary,
    };
  }

  private toCreateInput(
    normalized: NormalizedSettlementEvent,
    tenantId: string | null,
    sourceWebhookInboxEventId: string | undefined,
    receivedAt: Date,
  ): Prisma.ProviderSettlementEventUncheckedCreateInput {
    return {
      tenantId,
      provider: normalized.provider,
      providerEventId: normalized.providerEventId,
      providerSettlementId: normalized.providerSettlementId,
      providerPaymentId: normalized.providerPaymentId,
      externalReference: normalized.externalReference,
      eventType: normalized.eventType,
      providerStatus: normalized.providerStatus,
      amountMinor: this.toDecimal(normalized.amountMinor),
      feeAmountMinor: this.toDecimal(normalized.feeAmountMinor),
      netAmountMinor: this.toDecimal(normalized.netAmountMinor),
      currency: normalized.currency,
      currencyExponent: normalized.currencyExponent,
      occurredAt: normalized.occurredAt,
      availableAt: normalized.availableAt,
      payloadHash: normalized.payloadHash,
      normalizedPayload: normalized.normalizedPayload as Prisma.InputJsonValue,
      sourceWebhookInboxEventId,
      receivedAt,
    };
  }

  private resolveAmountInCents(payloadSummary: Record<string, unknown>) {
    const value = payloadSummary.value;
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return undefined;
    }

    return Number(new Prisma.Decimal(value).mul(100).toFixed(0));
  }

  private resolveOccurredAt(payloadSummary: Record<string, unknown>, fallback: Date) {
    return typeof payloadSummary.eventDate === 'string'
      ? new Date(payloadSummary.eventDate)
      : fallback;
  }

  private toDecimal(value: string | undefined) {
    return value === undefined ? undefined : new Prisma.Decimal(value);
  }

  private hash(payload: Record<string, unknown>) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
