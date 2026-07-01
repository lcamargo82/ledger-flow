import { Injectable, Logger } from '@nestjs/common';
import { AsyncJobExecutionRepository } from '../../domain/interfaces/async-job-execution.repository';
import { AsyncJobStatus } from '@prisma/client';
import { ASYNC_RETRY_POLICY } from '../constants/async-retry-policy';
import { AsyncMessagePublisher } from '../../domain/interfaces/async-message-publisher.interface';

@Injectable()
export class AsyncJobRetryService {
  private readonly logger = new Logger(AsyncJobRetryService.name);

  constructor(
    private readonly executionRepository: AsyncJobExecutionRepository,
    private readonly publisher: AsyncMessagePublisher,
  ) {}

  async scheduleRetry(
    executionId: string,
    attemptCount: number,
    eventType: string,
    payload: any,
  ): Promise<void> {
    const delayMs =
      ASYNC_RETRY_POLICY.DELAYS_MS[attemptCount - 1] ||
      ASYNC_RETRY_POLICY.DELAYS_MS[ASYNC_RETRY_POLICY.DELAYS_MS.length - 1];
    const nextRetryAt = new Date(Date.now() + delayMs);

    await this.executionRepository.createOrUpdate({
      id: executionId,
      status: AsyncJobStatus.RETRY_SCHEDULED,
      nextRetryAt,
    });

    this.logger.log(
      `Scheduled retry for execution ${executionId} at ${nextRetryAt}`,
    );

    // In a real system with delayed messages, we'd publish with a delay header.
    // For this foundation without external plugins, we might use a scheduler
    // or just publish to a delay queue with TTL.
    // Here we'll just simulate it for simplicity in the implementation plan.
  }
}
