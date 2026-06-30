import { AsyncJobExecution } from '@prisma/client';

export interface AsyncJobExecutionRepository {
  findByEventAndConsumer(outboxEventId: string, consumerName: string): Promise<AsyncJobExecution | null>;
  createOrUpdate(data: Partial<AsyncJobExecution>): Promise<AsyncJobExecution>;
}
