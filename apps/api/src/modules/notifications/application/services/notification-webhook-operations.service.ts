import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationWebhookDelivery,
  NotificationWebhookDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { NotificationCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { NotificationWebhookDeliveryResponseDto } from '../dto/notification-webhook-delivery.dto';

@Injectable()
export class NotificationWebhookOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async test(tenantId: string, userId: string, subscriptionId: string) {
    await this.findSubscription(tenantId, subscriptionId, true);

    return this.prisma.$transaction(async (transaction) => {
      const event = await transaction.notificationEvent.create({
        data: {
          tenantId,
          category: NotificationCategory.SYSTEM,
          eventType: 'notification.webhook.test',
          severity: NotificationSeverity.INFO,
          titleKey: 'notifications.webhook.test.title',
          messageKey: 'notifications.webhook.test.message',
          sourceType: 'NotificationWebhookSubscription',
          sourceId: subscriptionId,
          idempotencyKey: `webhook-test:${subscriptionId}:${randomUUID()}`,
          requiredPermissions: ['notifications:manage'],
          requiredCapabilities: [NotificationCapabilities.Manage],
          occurredAt: new Date(),
        },
      });
      const delivery = await transaction.notificationWebhookDelivery.create({
        data: {
          tenantId,
          subscriptionId,
          notificationEventId: event.id,
          idempotencyKey: `${subscriptionId}:${event.id}`,
        },
      });
      await this.createOutbox(transaction, tenantId, delivery.id);
      await this.createAudit(
        transaction,
        tenantId,
        userId,
        'notifications.webhook.test_requested',
        delivery.id,
        subscriptionId,
      );
      return { delivery: this.sanitize(delivery) };
    });
  }

  async replay(tenantId: string, userId: string, subscriptionId: string, deliveryId: string) {
    const delivery = await this.prisma.notificationWebhookDelivery.findFirst({
      where: { id: deliveryId, tenantId, subscriptionId },
    });
    if (!delivery) throw new NotFoundException('Webhook delivery not found.');
    if (delivery.status !== NotificationWebhookDeliveryStatus.DLQ) {
      throw new ConflictException('Only DLQ webhook deliveries can be replayed.');
    }

    await this.prisma.$transaction(async (transaction) => {
      const claim = await transaction.notificationWebhookDelivery.updateMany({
        where: {
          id: deliveryId,
          tenantId,
          subscriptionId,
          status: NotificationWebhookDeliveryStatus.DLQ,
        },
        data: {
          status: NotificationWebhookDeliveryStatus.PENDING,
          attemptCount: 0,
          nextAttemptAt: null,
          lastAttemptAt: null,
          deliveredAt: null,
          responseStatusCode: null,
          errorCode: null,
        },
      });
      if (claim.count !== 1)
        throw new ConflictException('Webhook delivery replay already claimed.');
      await this.createOutbox(transaction, tenantId, deliveryId);
      await this.createAudit(
        transaction,
        tenantId,
        userId,
        'notifications.webhook.delivery_replayed',
        deliveryId,
        subscriptionId,
      );
    });

    return {
      delivery: this.sanitize({
        ...delivery,
        status: NotificationWebhookDeliveryStatus.PENDING,
        attemptCount: 0,
        nextAttemptAt: null,
        lastAttemptAt: null,
        deliveredAt: null,
        responseStatusCode: null,
        errorCode: null,
        updatedAt: new Date(),
      }),
    };
  }

  async list(tenantId: string, subscriptionId: string, take: number) {
    await this.findSubscription(tenantId, subscriptionId, false);
    const where = { tenantId, subscriptionId };
    const [groups, deliveries] = await Promise.all([
      this.prisma.notificationWebhookDelivery.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.notificationWebhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
      }),
    ]);
    const counts = Object.fromEntries(
      Object.values(NotificationWebhookDeliveryStatus).map((status) => [status, 0]),
    ) as Record<NotificationWebhookDeliveryStatus, number>;
    for (const group of groups) counts[group.status] = group._count.status;
    return { counts, data: deliveries.map((item) => this.sanitize(item)) };
  }

  private async findSubscription(tenantId: string, id: string, requireActive: boolean) {
    const subscription = await this.prisma.notificationWebhookSubscription.findFirst({
      where: {
        id,
        tenantId,
        ...(requireActive && { status: 'ACTIVE' }),
      },
    });
    if (!subscription) throw new NotFoundException('Webhook subscription not found.');
    return subscription;
  }

  private createOutbox(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    deliveryId: string,
  ) {
    const payload = { deliveryId, attempt: 1 };
    return transaction.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'NotificationWebhookDelivery',
        aggregateId: deliveryId,
        eventType: 'notification.webhook.delivery_requested',
        eventVersion: 1,
        payload,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
  }

  private createAudit(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    action: string,
    deliveryId: string,
    subscriptionId: string,
  ) {
    return transaction.auditLog.create({
      data: {
        tenantId,
        actorUserId: userId,
        action,
        entityType: 'NotificationWebhookDelivery',
        entityId: deliveryId,
        metadata: { subscriptionId },
      },
    });
  }

  private sanitize(delivery: NotificationWebhookDelivery): NotificationWebhookDeliveryResponseDto {
    return {
      id: delivery.id,
      status: delivery.status,
      attemptCount: delivery.attemptCount,
      maxAttempts: delivery.maxAttempts,
      nextAttemptAt: delivery.nextAttemptAt,
      lastAttemptAt: delivery.lastAttemptAt,
      deliveredAt: delivery.deliveredAt,
      responseStatusCode: delivery.responseStatusCode,
      errorCode: delivery.errorCode,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    };
  }
}
