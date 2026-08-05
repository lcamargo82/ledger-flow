import { Injectable } from '@nestjs/common';
import { Prisma, ProviderSettlementEvent, WebhookInboxEvent } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { NormalizedWebhookEvent } from '../../../webhooks/domain/interfaces/provider-webhook-adapter.interface';
import { AsaasReconciliationProviderAdapter } from '../../infra/adapters/asaas-reconciliation-provider.adapter';
import { NormalizedSettlementEvent } from '../../domain/interfaces/reconciliation-provider-adapter.interface';

interface IngestionResult {
  settlementEvent: ProviderSettlementEvent | null;
  created: boolean;
  updated: boolean;
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
      return { settlementEvent: null, created: false, updated: false };
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
        const data = this.toUpdateInput(normalized, tenantId, sourceWebhookInboxEventId, receivedAt);
        if (!this.hasMeaningfulChange(existing, data)) {
          return { settlementEvent: existing, created: false, updated: false };
        }

        const settlementEvent = await tx.providerSettlementEvent.update({
          where: { id: existing.id },
          data,
        });
        await this.enqueueSettlementReceived(tx, settlementEvent);

        return { settlementEvent, created: false, updated: true };
      }

      const settlementEvent = await tx.providerSettlementEvent.create({
        data: this.toCreateInput(normalized, tenantId, sourceWebhookInboxEventId, receivedAt),
      });

      await this.enqueueSettlementReceived(tx, settlementEvent);

      return { settlementEvent, created: true, updated: false };
    });
  }

  private async enqueueSettlementReceived(
    tx: Prisma.TransactionClient,
    settlementEvent: ProviderSettlementEvent,
  ) {
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
      operationalFinancialAccountId: normalized.operationalFinancialAccountId,
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

  private toUpdateInput(
    normalized: NormalizedSettlementEvent,
    tenantId: string | null,
    sourceWebhookInboxEventId: string | undefined,
    receivedAt: Date,
  ): Prisma.ProviderSettlementEventUncheckedUpdateInput {
    return {
      tenantId,
      operationalFinancialAccountId: normalized.operationalFinancialAccountId,
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

  private hasMeaningfulChange(
    existing: ProviderSettlementEvent,
    data: Prisma.ProviderSettlementEventUncheckedUpdateInput,
  ) {
    const keys: Array<keyof Prisma.ProviderSettlementEventUncheckedUpdateInput> = [
      'tenantId',
      'operationalFinancialAccountId',
      'providerSettlementId',
      'providerPaymentId',
      'externalReference',
      'eventType',
      'providerStatus',
      'amountMinor',
      'feeAmountMinor',
      'netAmountMinor',
      'currency',
      'currencyExponent',
      'occurredAt',
      'availableAt',
      'payloadHash',
      'normalizedPayload',
    ];

    return keys.some((key) => {
      const nextValue = data[key];
      if (nextValue === undefined) return false;
      return !this.areEqual((existing as Record<string, unknown>)[key], nextValue);
    });
  }

  private areEqual(current: unknown, next: unknown) {
    if (current instanceof Prisma.Decimal || next instanceof Prisma.Decimal) {
      return this.decimalString(current) === this.decimalString(next);
    }
    if (current instanceof Date || next instanceof Date) {
      return this.dateTime(current) === this.dateTime(next);
    }
    if (this.isPlainObject(current) || this.isPlainObject(next)) {
      return JSON.stringify(current ?? null) === JSON.stringify(next ?? null);
    }

    return current === next;
  }

  private decimalString(value: unknown) {
    if (value === null || value === undefined) return null;
    return new Prisma.Decimal(value as Prisma.Decimal.Value).toString();
  }

  private dateTime(value: unknown) {
    if (value === null || value === undefined) return null;
    return value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
  }

  private isPlainObject(value: unknown) {
    return value !== null && typeof value === 'object' && !(value instanceof Date);
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
