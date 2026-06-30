import { OutboxEvent } from '@prisma/client';
import { AsyncJobResponseDto } from '../dto/async-job-response.dto';

export class AsyncJobMapper {
  static toResponseDto(event: OutboxEvent): AsyncJobResponseDto {
    return {
      id: event.id,
      tenantId: event.tenantId || undefined,
      eventType: event.eventType,
      status: event.status,
      publishAttempts: event.publishAttempts,
      createdAt: event.createdAt,
      traceId: event.traceId || undefined,
      lastErrorSummary: event.lastErrorSummary || undefined,
    };
  }
}
