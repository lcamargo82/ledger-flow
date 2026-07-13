import { Injectable } from '@nestjs/common';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { NotificationWebhookDeliveryExecutorService } from '../services/notification-webhook-delivery-executor.service';

@Injectable()
export class NotificationWebhookDeliveryRequestedHandler implements AsyncEventHandler {
  readonly eventType = 'notification.webhook.delivery_requested';
  readonly consumerName = 'NotificationWebhookDeliveryRequestedHandler';

  constructor(private readonly executor: NotificationWebhookDeliveryExecutorService) {}

  async handle(input: AsyncMessageEnvelope): Promise<void> {
    const payload: unknown = input.payload;
    if (!this.isDeliveryPayload(payload) || payload.deliveryId !== input.aggregateId) {
      throw new Error('Invalid notification webhook delivery message.');
    }
    await this.executor.execute(payload.deliveryId, payload.attempt);
  }

  private isDeliveryPayload(payload: unknown): payload is { deliveryId: string; attempt: number } {
    if (!payload || typeof payload !== 'object') return false;
    const value = payload as Record<string, unknown>;
    return (
      typeof value.deliveryId === 'string' &&
      Number.isInteger(value.attempt) &&
      typeof value.attempt === 'number' &&
      value.attempt > 0
    );
  }
}
