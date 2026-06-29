import { NormalizedWebhookEvent } from './provider-webhook-adapter.interface';

export interface WebhookProcessingResult {
  status: 'PROCESSED' | 'IGNORED' | 'FAILED';
  reason?: string;
  paymentId?: string;
  tenantId?: string;
  previousStatus?: string;
  currentStatus?: string;
}

export interface WebhookEventProcessor {
  process(event: NormalizedWebhookEvent): Promise<WebhookProcessingResult>;
}
