import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { OutboxRepository } from '../../domain/interfaces/outbox.repository';
import { OutboxEvent, OutboxEventStatus } from '@prisma/client';

@Injectable()
export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.create({ data });
  }

  async findPendingAndLock(
    batchSize: number,
    lockOwner: string,
    leaseDurationMs: number,
  ): Promise<OutboxEvent[]> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

    // Using raw query to lock and update safely
    const lockedEvents = await this.prisma.$queryRaw<OutboxEvent[]>`
      UPDATE "outbox_events"
      SET "status" = 'PUBLISHING',
          "lockOwner" = ${lockOwner},
          "lockedAt" = ${now},
          "leaseExpiresAt" = ${leaseExpiresAt},
          "publishAttempts" = "publishAttempts" + 1
      WHERE "id" IN (
        SELECT "id"
        FROM "outbox_events"
        WHERE ("status" = 'PENDING' OR ("status" = 'PUBLISHING' AND "leaseExpiresAt" < ${now}))
          AND "availableAt" <= ${now}
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

  async paginate(query: any): Promise<any> {
    const { skip = 0, take = 10, where, orderBy = { createdAt: 'desc' } } = query;
    const [items, total] = await Promise.all([
      this.prisma.outboxEvent.findMany({ skip, take, where, orderBy }),
      this.prisma.outboxEvent.count({ where }),
    ]);
    return { items, total };
  }
}
