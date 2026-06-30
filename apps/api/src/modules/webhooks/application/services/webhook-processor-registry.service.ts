import { Injectable } from '@nestjs/common';
import { WebhookProvider } from '@prisma/client';
import { WebhookEventProcessor } from '../../domain/interfaces/webhook-event-processor.interface';
import { WebhookProviderNotSupportedError } from '../../domain/errors/webhook-errors';

@Injectable()
export class WebhookProcessorRegistryService {
  private readonly processors = new Map<WebhookProvider, WebhookEventProcessor>();

  register(provider: WebhookProvider, processor: WebhookEventProcessor): void {
    this.processors.set(provider, processor);
  }

  getProcessor(provider: WebhookProvider): WebhookEventProcessor {
    const processor = this.processors.get(provider);
    if (!processor) {
      throw new WebhookProviderNotSupportedError(
        `Nenhum processor registrado para o provedor ${provider}`,
      );
    }
    return processor;
  }
}
