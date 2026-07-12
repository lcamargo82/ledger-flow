import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ListNotificationsQueryDto } from '../dto/list-notifications-query.dto';
import { NotificationAccessPolicyService } from './notification-access-policy.service';

const EVENT_INCLUDE = { notificationEvent: true } satisfies Prisma.NotificationRecipientInclude;

@Injectable()
export class NotificationFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: NotificationAccessPolicyService,
  ) {}

  async list(tenantId: string, userId: string, query: ListNotificationsQueryDto) {
    const eventTypes = await this.accessPolicy.getVisibleEventTypes(tenantId, userId);
    if (!eventTypes.length) return { data: [], meta: { nextCursor: null } };

    const limit = query.limit ?? 20;
    const recipients = await this.prisma.notificationRecipient.findMany({
      where: this.buildWhere(tenantId, userId, eventTypes, query),
      include: EVENT_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasNextPage = recipients.length > limit;
    const page = recipients.slice(0, limit);
    const last = page.at(-1);

    return {
      data: page.map((recipient) => this.toResponse(recipient)),
      meta: { nextCursor: hasNextPage && last ? this.encodeCursor(last.createdAt, last.id) : null },
    };
  }

  async unreadCount(tenantId: string, userId: string) {
    const eventTypes = await this.accessPolicy.getVisibleEventTypes(tenantId, userId);
    if (!eventTypes.length) return { count: 0 };
    const count = await this.prisma.notificationRecipient.count({
      where: this.baseWhere(tenantId, userId, eventTypes, true),
    });
    return { count };
  }

  async markRead(tenantId: string, userId: string, id: string) {
    const eventTypes = await this.accessPolicy.getVisibleEventTypes(tenantId, userId);
    const result = await this.prisma.notificationRecipient.updateMany({
      where: { ...this.baseWhere(tenantId, userId, eventTypes), id },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notification not found.');
    return { id, read: true };
  }

  async markAllRead(tenantId: string, userId: string) {
    const eventTypes = await this.accessPolicy.getVisibleEventTypes(tenantId, userId);
    const result = await this.prisma.notificationRecipient.updateMany({
      where: this.baseWhere(tenantId, userId, eventTypes, true),
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async dismiss(tenantId: string, userId: string, id: string) {
    const eventTypes = await this.accessPolicy.getVisibleEventTypes(tenantId, userId);
    const result = await this.prisma.notificationRecipient.updateMany({
      where: { ...this.baseWhere(tenantId, userId, eventTypes), id },
      data: { dismissedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notification not found.');
  }

  private baseWhere(tenantId: string, userId: string, eventTypes: string[], unread = false) {
    return {
      tenantId,
      userId,
      dismissedAt: null,
      ...(unread && { readAt: null }),
      notificationEvent: { eventType: { in: eventTypes } },
    } satisfies Prisma.NotificationRecipientWhereInput;
  }

  private buildWhere(
    tenantId: string,
    userId: string,
    eventTypes: string[],
    query: ListNotificationsQueryDto,
  ): Prisma.NotificationRecipientWhereInput {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    return {
      ...this.baseWhere(tenantId, userId, eventTypes, query.unread),
      notificationEvent: {
        eventType: { in: eventTypes },
        ...(query.category && { category: query.category }),
        ...(query.severity && { severity: query.severity }),
        ...((query.from || query.to) && {
          occurredAt: {
            ...(query.from && { gte: new Date(query.from) }),
            ...(query.to && { lte: new Date(query.to) }),
          },
        }),
      },
      ...(cursor && {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      }),
    };
  }

  private encodeCursor(createdAt: Date, id: string) {
    return Buffer.from(JSON.stringify([createdAt.toISOString(), id])).toString('base64url');
  }

  private decodeCursor(cursor: string) {
    try {
      const [createdAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as string[];
      const date = new Date(createdAt);
      if (!id || Number.isNaN(date.getTime())) throw new Error();
      return { createdAt: date, id };
    } catch {
      throw new BadRequestException('Invalid notification cursor.');
    }
  }

  private toResponse(
    recipient: Prisma.NotificationRecipientGetPayload<{ include: typeof EVENT_INCLUDE }>,
  ) {
    const event = recipient.notificationEvent;
    return {
      id: recipient.id,
      eventType: event.eventType,
      category: event.category,
      severity: event.severity,
      titleKey: event.titleKey,
      messageKey: event.messageKey,
      translationArgs: event.translationArgsJson,
      metadata: event.metadataJson,
      sourceId: event.sourceId,
      readAt: recipient.readAt,
      occurredAt: event.occurredAt,
      createdAt: recipient.createdAt,
    };
  }
}
