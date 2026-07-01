import { OutboxEvent } from '@prisma/client';

export abstract class OutboxRepository {
  abstract create(
    data: Omit<
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
    >,
  ): Promise<OutboxEvent>;
  abstract findPendingAndLock(
    batchSize: number,
    lockOwner: string,
    leaseDurationMs: number,
  ): Promise<OutboxEvent[]>;
  abstract markAsPublished(id: string): Promise<void>;
  abstract markAsFailed(id: string, errorCode: string, errorSummary: string): Promise<void>;
  abstract releaseLock(id: string): Promise<void>;
  abstract findById(id: string): Promise<OutboxEvent | null>;
  abstract paginate(query: any): Promise<any>;
}
