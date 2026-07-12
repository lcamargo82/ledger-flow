import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import type { RegisteredNotificationEventType } from '../../domain/constants/notification-event-registry';

@Injectable()
export class NotificationWebhookDeliveryPlannerService {
  async plan(
    transaction: Prisma.TransactionClient,
    input: {
      tenantId: string;
      notificationEventId: string;
      eventType: RegisteredNotificationEventType;
    },
  ) {
    const subscriptions = await transaction.notificationWebhookSubscription.findMany({
      where: {
        tenantId: input.tenantId,
        status: 'ACTIVE',
        eventTypes: { has: input.eventType },
      },
      select: { id: true },
    });

    for (const subscription of subscriptions) {
      const idempotencyKey = `${subscription.id}:${input.notificationEventId}`;
      const delivery = await transaction.notificationWebhookDelivery.create({
        data: {
          tenantId: input.tenantId,
          subscriptionId: subscription.id,
          notificationEventId: input.notificationEventId,
          idempotencyKey,
        },
      });
      const payload = {
        deliveryId: delivery.id,
        attempt: 1,
      };
      const serializedPayload = JSON.stringify(payload);

      await transaction.outboxEvent.create({
        data: {
          tenantId: input.tenantId,
          aggregateType: 'NotificationWebhookDelivery',
          aggregateId: delivery.id,
          eventType: 'notification.webhook.delivery_requested',
          eventVersion: 1,
          payload,
          payloadHash: createHash('sha256').update(serializedPayload).digest('hex'),
        },
      });
    }

    return { scheduled: subscriptions.length };
  }
}
