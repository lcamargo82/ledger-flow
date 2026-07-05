import { Injectable } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import { ProviderWebhookAdapter } from '../../domain/interfaces/provider-webhook-adapter.interface';
import { WebhookProviderNotSupportedError } from '../../domain/errors/webhook-errors';

@Injectable()
export class WebhookAdapterRegistryService {
  private readonly adapters = new Map<WebhookProvider, ProviderWebhookAdapter>();

  register(provider: WebhookProvider, adapter: ProviderWebhookAdapter): void {
    this.adapters.set(provider, adapter);
  }

  getAdapter(provider: WebhookProvider): ProviderWebhookAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new WebhookProviderNotSupportedError(
        `Nenhum adapter registrado para o provedor ${provider}`,
      );
    }
    return adapter;
  }
}
