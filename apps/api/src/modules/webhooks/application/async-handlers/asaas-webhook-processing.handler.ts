import { Injectable, Logger } from '@nestjs/common';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { WebhookProcessorRegistryService } from '../services/webhook-processor-registry.service';
import { WebhookProcessingStatus } from '@prisma/client';
import { NonRetryableAsyncJobError } from '../../../async/domain/errors/non-retryable-async-job.error';
import { NormalizedWebhookEvent } from '../../domain/interfaces/provider-webhook-adapter.interface';

@Injectable()
export class AsaasWebhookProcessingAsyncHandler implements AsyncEventHandler {
  readonly eventType = 'webhook.inbound_processing_requested';
  readonly consumerName = 'AsaasWebhookProcessingAsyncHandler';
  private readonly logger = new Logger(AsaasWebhookProcessingAsyncHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processorRegistry: WebhookProcessorRegistryService,
  ) {}

  async handle(input: AsyncMessageEnvelope): Promise<void> {
    this.logger.log(`Handling webhook processing for inbox event ${input.aggregateId}`);
    const inboxEvent = await this.prisma.webhookInboxEvent.findUnique({
      where: { id: input.aggregateId },
    });

    if (!inboxEvent) {
      this.logger.error(`Webhook inbox event ${input.aggregateId} not found`);
      return;
    }

    if (
      inboxEvent.status === WebhookProcessingStatus.PROCESSED ||
      inboxEvent.status === WebhookProcessingStatus.IGNORED
    ) {
      this.logger.log(`Webhook ${input.aggregateId} already in final state (${inboxEvent.status})`);
      return;
    }

    if (!inboxEvent.eventType || inboxEvent.eventType === 'INVALID_EVENT_TYPE') {
      this.logger.error(`Webhook inbox event ${input.aggregateId} has invalid eventType`);
      await this.prisma.webhookInboxEvent.update({
        where: { id: input.aggregateId },
        data: {
          status: WebhookProcessingStatus.INVALID,
          failureReason: 'Invalid eventType',
        },
      });
      throw new NonRetryableAsyncJobError(`Permanent failure: eventType missing or invalid`);
    }

    const processor = this.processorRegistry.getProcessor(inboxEvent.provider);
    if (!processor) {
      this.logger.error(`No processor found for provider ${inboxEvent.provider}`);
      return;
    }

    // We pass the raw payload that is inside the inbox event (wait, it's not saved completely, let's pass summary)
    // Cast it properly to avoid unsafe argument errors
    const normalizedEvent = inboxEvent.payloadSummary as unknown as NormalizedWebhookEvent;
    await processor.process(normalizedEvent);
    this.logger.log(`Successfully processed webhook ${input.aggregateId}`);
  }
}
