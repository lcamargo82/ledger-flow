import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { ChannelOrderIntakeService } from '../services/channel-order-intake.service';

@Injectable()
export class ChannelWebhookReceivedAsyncHandler implements AsyncEventHandler {
  readonly eventType = 'channel.webhook.received';
  readonly consumerName = 'ChannelWebhookReceivedAsyncHandler';
  private readonly logger = new Logger(ChannelWebhookReceivedAsyncHandler.name);

  constructor(private readonly orderIntakeService: ChannelOrderIntakeService) {}

  async handle(input: AsyncMessageEnvelope): Promise<void> {
    if (!input.aggregateId) {
      throw new BadRequestException('Channel webhook inbox event id is required.');
    }

    this.logger.log(`Processing channel webhook inbox event ${input.aggregateId}`);
    await this.orderIntakeService.processInboxEvent(input.aggregateId);
  }
}
