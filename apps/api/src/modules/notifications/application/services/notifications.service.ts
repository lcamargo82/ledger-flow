import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  getNotificationEventContract,
  type RegisteredNotificationEventType,
} from '../../domain/constants/notification-event-registry';
import { NotificationAudienceResolverService } from './notification-audience-resolver.service';
import { NotificationWebhookDeliveryPlannerService } from './notification-webhook-delivery-planner.service';

export interface CreateNotificationEventInput {
  tenantId: string;
  eventType: RegisteredNotificationEventType;
  idempotencyKey: string;
  sourceType: string;
  sourceId?: string;
  occurredAt: Date;
  translationArgs?: Record<string, string | number | boolean | null>;
  metadata?: Record<string, string | number | boolean | null>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceResolver: NotificationAudienceResolverService,
    private readonly deliveryPlanner: NotificationWebhookDeliveryPlannerService,
  ) {}

  async createEvent(input: CreateNotificationEventInput) {
    const contract = getNotificationEventContract(input.eventType);
    const userIds =
      contract.audienceDelivery === false
        ? []
        : await this.audienceResolver.resolve(input.tenantId, contract);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existingEvent = await transaction.notificationEvent.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: input.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });

        if (existingEvent) return { event: existingEvent, created: false };

        const event = await transaction.notificationEvent.create({
          data: {
            tenantId: input.tenantId,
            eventType: input.eventType,
            idempotencyKey: input.idempotencyKey,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            occurredAt: input.occurredAt,
            category: contract.category,
            severity: contract.severity,
            titleKey: contract.titleKey,
            messageKey: contract.messageKey,
            requiredPermissions: contract.requiredPermissions,
            requiredCapabilities: contract.requiredCapabilities,
            translationArgsJson: input.translationArgs,
            metadataJson: input.metadata,
          },
        });

        if (userIds.length > 0) {
          await transaction.notificationRecipient.createMany({
            data: userIds.map((userId) => ({
              tenantId: input.tenantId,
              notificationEventId: event.id,
              userId,
            })),
            skipDuplicates: true,
          });
        }

        if (contract.webhookDelivery !== false) {
          await this.deliveryPlanner.plan(transaction, {
            tenantId: input.tenantId,
            notificationEventId: event.id,
            eventType: input.eventType,
          });
        }

        return { event, created: true };
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const event = await this.prisma.notificationEvent.findUniqueOrThrow({
        where: {
          tenantId_idempotencyKey: {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      return { event, created: false };
    }
  }
}
