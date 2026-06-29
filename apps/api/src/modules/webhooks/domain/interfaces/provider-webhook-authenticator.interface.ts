import { ProviderWebhookAuthenticationInput } from './provider-webhook-adapter.interface';

export interface ProviderWebhookAuthenticator {
  authenticate(input: ProviderWebhookAuthenticationInput): Promise<void>;
}
