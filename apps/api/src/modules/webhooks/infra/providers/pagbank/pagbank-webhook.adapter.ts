/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
import { WebhookProvider } from '@prisma/client';
import { WebhookProviderNotSupportedError } from '../../../domain/errors/webhook-errors';
import {
  NormalizedWebhookEvent,
  ProviderWebhookAdapter,
  ProviderWebhookAuthenticationInput,
  ProviderWebhookPayloadInput,
} from '../../../domain/interfaces/provider-webhook-adapter.interface';

export class PagBankWebhookAdapter implements ProviderWebhookAdapter {
  readonly provider = WebhookProvider.PAGBANK;

  async authenticate(input: ProviderWebhookAuthenticationInput): Promise<void> {
    throw new WebhookProviderNotSupportedError(
      'PagBank webhook adapter not implemented.',
    );
  }

  async normalize(
    input: ProviderWebhookPayloadInput,
  ): Promise<NormalizedWebhookEvent> {
    throw new WebhookProviderNotSupportedError(
      'PagBank webhook adapter not implemented.',
    );
  }

  supportsEvent(eventType: string): boolean {
    return false;
  }
}
