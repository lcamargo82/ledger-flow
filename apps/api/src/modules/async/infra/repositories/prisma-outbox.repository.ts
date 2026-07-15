import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CreateOutboxEventData,
  OutboxRepository,
  PaginatedOutboxEvents,
  PaginateOutboxEventsQuery,
} from '../../domain/interfaces/outbox.repository';
import { OutboxEvent, OutboxEventStatus, Prisma } from '@prisma/client';

@Injectable()
export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOutboxEventData): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.create({
      data: data as Prisma.OutboxEventUncheckedCreateInput,
    });
  }

  async findPendingAndLock(
    batchSize: number,
    lockOwner: string,
    leaseDurationMs: number,
  ): Promise<OutboxEvent[]> {
    const lockedEvents = await this.prisma.$queryRaw<OutboxEvent[]>`
      UPDATE "outbox_events"
      SET "status" = 'PUBLISHING',
          "lockOwner" = ${lockOwner},
          "lockedAt" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
          "leaseExpiresAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
            + (${leaseDurationMs} * INTERVAL '1 millisecond'),
          "publishAttempts" = "publishAttempts" + 1
      WHERE "id" IN (
        SELECT "id"
        FROM "outbox_events"
        WHERE (
          "status" = 'PENDING'
          OR (
            "status" = 'PUBLISHING'
            AND "leaseExpiresAt" < CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
          )
        )
          AND "availableAt" <= CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
        ORDER BY "availableAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;

    return lockedEvents;
  }

  async markAsPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.PUBLISHED,
        publishedAt: new Date(),
        lockOwner: null,
        lockedAt: null,
        leaseExpiresAt: null,
      },
    });
  }

  async markAsFailed(id: string, errorCode: string, errorSummary: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.FAILED,
        lastErrorCode: errorCode,
        lastErrorSummary: errorSummary,
        lockOwner: null,
        lockedAt: null,
        leaseExpiresAt: null,
      },
    });
  }

  async releaseLock(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.PENDING,
        lockOwner: null,
        lockedAt: null,
        leaseExpiresAt: null,
      },
    });
  }

  async findById(id: string): Promise<OutboxEvent | null> {
    return this.prisma.outboxEvent.findUnique({ where: { id } });
  }

  async paginate(query: PaginateOutboxEventsQuery): Promise<PaginatedOutboxEvents> {
    const { skip = 0, take = 10, where, orderBy = { createdAt: 'desc' } } = query;
    const [items, total] = await Promise.all([
      this.prisma.outboxEvent.findMany({ skip, take, where, orderBy }),
      this.prisma.outboxEvent.count({ where }),
    ]);
    return { items, total };
  }
}
