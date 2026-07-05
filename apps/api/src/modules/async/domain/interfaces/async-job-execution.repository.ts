import { AsyncJobExecution } from '@prisma/client';

export abstract class AsyncJobExecutionRepository {
  abstract findByEventAndConsumer(
    outboxEventId: string,
    consumerName: string,
  ): Promise<AsyncJobExecution | null>;
  abstract createOrUpdate(data: Partial<AsyncJobExecution>): Promise<AsyncJobExecution>;
}
