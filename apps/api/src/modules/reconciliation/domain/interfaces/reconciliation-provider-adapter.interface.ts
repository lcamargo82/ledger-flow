import { WebhookProvider } from '@prisma/client';

export interface NormalizedSettlementEvent {
  provider: WebhookProvider;
  providerEventId: string;
  providerSettlementId?: string;
  providerPaymentId?: string;
  externalReference?: string;
  eventType: string;
  providerStatus?: string;
  amountMinor?: string;
  feeAmountMinor?: string;
  netAmountMinor?: string;
  currency: string;
  currencyExponent: number;
  occurredAt?: Date;
  availableAt?: Date;
  payloadHash: string;
  normalizedPayload: Record<string, unknown>;
}

export interface SyncInput {
  tenantId: string;
  from?: Date;
  to?: Date;
  cursor?: string;
}

export interface ProviderSettlementPage {
  data: NormalizedSettlementEvent[];
  nextCursor?: string;
}

export interface ReconciliationProviderAdapter {
  readonly provider: WebhookProvider;
  normalizeWebhook(input: unknown): NormalizedSettlementEvent | null;
  fetchSettlements(input: SyncInput): Promise<ProviderSettlementPage>;
  supportsSettlementSync(): boolean;
}
