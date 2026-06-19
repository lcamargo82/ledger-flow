import {
  NormalizedWebhookEvent,
  ProviderWebhookPayloadInput,
} from './provider-webhook-adapter.interface';

export interface ProviderWebhookNormalizer {
  normalize(input: ProviderWebhookPayloadInput): Promise<NormalizedWebhookEvent>;
}
