import { OutboxEvent } from '@prisma/client';

export interface OutboxRepository {
  create(data: Omit<OutboxEvent, 'id' | 'createdAt' | 'updatedAt' | 'publishAttempts' | 'status' | 'publishedAt' | 'lockedAt' | 'lockOwner' | 'leaseExpiresAt' | 'lastErrorCode' | 'lastErrorSummary'>): Promise<OutboxEvent>;
  findPendingAndLock(batchSize: number, lockOwner: string, leaseDurationMs: number): Promise<OutboxEvent[]>;
  markAsPublished(id: string): Promise<void>;
  markAsFailed(id: string, errorCode: string, errorSummary: string): Promise<void>;
  releaseLock(id: string): Promise<void>;
  findById(id: string): Promise<OutboxEvent | null>;
  paginate(query: any): Promise<any>;
}
