/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import {
  NormalizedWebhookEvent,
  ProviderWebhookAdapter,
  ProviderWebhookAuthenticationInput,
  ProviderWebhookPayloadInput,
} from '../../../domain/interfaces/provider-webhook-adapter.interface';
import { MercadoPagoWebhookAuthenticator } from './mercado-pago-webhook-authenticator';
import { MercadoPagoWebhookNormalizer } from './mercado-pago-webhook-normalizer';

@Injectable()
export class MercadoPagoWebhookAdapter implements ProviderWebhookAdapter {
  readonly provider = WebhookProvider.MERCADO_PAGO;

  constructor(
    private readonly authenticator: MercadoPagoWebhookAuthenticator,
    private readonly normalizer: MercadoPagoWebhookNormalizer,
  ) {}

  async authenticate(input: ProviderWebhookAuthenticationInput): Promise<void> {
    await this.authenticator.authenticate(input);
  }

  async normalize(input: ProviderWebhookPayloadInput): Promise<NormalizedWebhookEvent> {
    return this.normalizer.normalize(input);
  }

  supportsEvent(eventType: string): boolean {
    return this.normalizer.supportsEvent(eventType);
  }
}
