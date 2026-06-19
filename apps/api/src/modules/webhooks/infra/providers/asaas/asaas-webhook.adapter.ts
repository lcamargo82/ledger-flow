/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import {
  NormalizedWebhookEvent,
  ProviderWebhookAdapter,
  ProviderWebhookAuthenticationInput,
  ProviderWebhookPayloadInput,
} from '../../../domain/interfaces/provider-webhook-adapter.interface';
import { AsaasWebhookAuthenticator } from './asaas-webhook-authenticator';
import { AsaasWebhookNormalizer } from './asaas-webhook-normalizer';

@Injectable()
export class AsaasWebhookAdapter implements ProviderWebhookAdapter {
  readonly provider = WebhookProvider.ASAAS;

  constructor(
    private readonly authenticator: AsaasWebhookAuthenticator,
    private readonly normalizer: AsaasWebhookNormalizer,
  ) {}

  async authenticate(input: ProviderWebhookAuthenticationInput): Promise<void> {
    await this.authenticator.authenticate(input);
  }

  async normalize(input: ProviderWebhookPayloadInput): Promise<NormalizedWebhookEvent> {
    return this.normalizer.normalize(input);
  }

  supportsEvent(_eventType: string): boolean {
    // ASAAS currently passes the event type down, we can assume true for known events or let it pass and be ignored later.
    return true;
  }
}
