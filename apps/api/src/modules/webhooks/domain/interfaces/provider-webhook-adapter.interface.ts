import { WebhookProvider } from '@prisma/client';

export interface ProviderWebhookAuthenticationInput {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer;
  payload?: any;
  requestMetadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface ProviderWebhookPayloadInput {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer;
  payload: any;
  receivedAt: Date;
}

export interface NormalizedWebhookEvent {
  provider: WebhookProvider;
  providerEventId: string;
  eventType: string;
  occurredAt?: Date;
  providerPaymentId?: string;
  paymentReference?: string;
  providerStatus?: string;
  normalizedPaymentStatus?: string;
  billingType?: string;
  amountInCents?: number;
  currency?: string;
  gatewayConfigurationId?: string;
  payloadHash: string;
  payloadSummary: Record<string, any>;
  rawProviderEventType: string;
  metadata?: Record<string, any>;
}

export interface ProviderWebhookAdapter {
  readonly provider: WebhookProvider;

  authenticate(input: ProviderWebhookAuthenticationInput): Promise<void>;

  normalize(
    input: ProviderWebhookPayloadInput,
  ): Promise<NormalizedWebhookEvent>;

  supportsEvent(eventType: string): boolean;
}
