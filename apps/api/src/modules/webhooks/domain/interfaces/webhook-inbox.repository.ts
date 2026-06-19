import { WebhookInboxEvent, WebhookProvider } from '@prisma/client';

export type CreateWebhookInboxEventInput = {
  provider: WebhookProvider;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  payloadSummary?: any;
};

export interface IWebhookInboxRepository {
  findByProviderEventId(
    provider: WebhookProvider,
    providerEventId: string,
  ): Promise<WebhookInboxEvent | null>;
  createReceived(data: CreateWebhookInboxEventInput): Promise<WebhookInboxEvent>;
  markProcessing(id: string): Promise<WebhookInboxEvent>;
  markProcessed(
    id: string,
    paymentId?: string,
    gatewayConfigurationId?: string,
    tenantId?: string,
  ): Promise<WebhookInboxEvent>;
  markIgnored(
    id: string,
    reason?: string,
    paymentId?: string,
    gatewayConfigurationId?: string,
    tenantId?: string,
  ): Promise<WebhookInboxEvent>;
  markFailed(id: string, reason: string): Promise<WebhookInboxEvent>;
  incrementAttempt(id: string): Promise<WebhookInboxEvent>;
  findRecentByPaymentId(paymentId: string): Promise<WebhookInboxEvent[]>;
}
