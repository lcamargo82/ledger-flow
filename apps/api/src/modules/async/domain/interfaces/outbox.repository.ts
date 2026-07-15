import { OutboxEvent, Prisma } from '@prisma/client';

export type CreateOutboxEventData = Omit<
  OutboxEvent,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'publishAttempts'
  | 'status'
  | 'publishedAt'
  | 'lockedAt'
  | 'lockOwner'
  | 'leaseExpiresAt'
  | 'lastErrorCode'
  | 'lastErrorSummary'
>;

export interface PaginateOutboxEventsQuery {
  skip?: number;
  take?: number;
  where?: Prisma.OutboxEventWhereInput;
  orderBy?: Prisma.OutboxEventOrderByWithRelationInput;
}

export interface PaginatedOutboxEvents {
  items: OutboxEvent[];
  total: number;
}

export abstract class OutboxRepository {
  abstract create(data: CreateOutboxEventData): Promise<OutboxEvent>;
  abstract findPendingAndLock(
    batchSize: number,
    lockOwner: string,
    leaseDurationMs: number,
  ): Promise<OutboxEvent[]>;
  abstract markAsPublished(id: string): Promise<void>;
  abstract markAsFailed(id: string, errorCode: string, errorSummary: string): Promise<void>;
  abstract releaseLock(id: string): Promise<void>;
  abstract findById(id: string): Promise<OutboxEvent | null>;
  abstract paginate(query: PaginateOutboxEventsQuery): Promise<PaginatedOutboxEvents>;
}
