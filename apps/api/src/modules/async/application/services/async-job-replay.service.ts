import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OutboxRepository } from '../../domain/interfaces/outbox.repository';
import { AsyncJobExecutionRepository } from '../../domain/interfaces/async-job-execution.repository';
import { OutboxEventStatus } from '@prisma/client';

@Injectable()
export class AsyncJobReplayService {
  private readonly logger = new Logger(AsyncJobReplayService.name);

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly executionRepository: AsyncJobExecutionRepository,
  ) {}

  async replayEvent(eventId: string, tenantId: string): Promise<any> {
    const event = await this.outboxRepository.findById(eventId);
    if (!event) throw new BadRequestException('Event not found');
    if (
      event.status !== OutboxEventStatus.FAILED &&
      event.status !== OutboxEventStatus.CANCELED
    ) {
      throw new BadRequestException(
        'Only failed or canceled events can be replayed',
      );
    }

    const newEvent = await this.outboxRepository.create({
      tenantId: event.tenantId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      payload: event.payload,
      payloadHash: event.payloadHash,
      traceId: event.traceId,
      replayOfEventId: event.id,
      availableAt: new Date(),
    });

    this.logger.log(`Replayed event ${eventId} as new event ${newEvent.id}`);
    return newEvent;
  }
}
