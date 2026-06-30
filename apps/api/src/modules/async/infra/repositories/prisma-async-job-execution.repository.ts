import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { AsyncJobExecutionRepository } from '../../domain/interfaces/async-job-execution.repository';
import { AsyncJobExecution } from '@prisma/client';

@Injectable()
export class PrismaAsyncJobExecutionRepository implements AsyncJobExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEventAndConsumer(
    outboxEventId: string,
    consumerName: string,
  ): Promise<AsyncJobExecution | null> {
    return this.prisma.asyncJobExecution.findUnique({
      where: {
        outboxEventId_consumerName: {
          outboxEventId,
          consumerName,
        },
      },
    });
  }

  async createOrUpdate(
    data: Partial<AsyncJobExecution>,
  ): Promise<AsyncJobExecution> {
    if (data.id) {
      return this.prisma.asyncJobExecution.update({
        where: { id: data.id },
        data,
      });
    }

    if (data.outboxEventId && data.consumerName) {
      const existing = await this.findByEventAndConsumer(
        data.outboxEventId,
        data.consumerName,
      );
      if (existing) {
        return this.prisma.asyncJobExecution.update({
          where: { id: existing.id },
          data,
        });
      }
    }

    return this.prisma.asyncJobExecution.create({ data: data as any });
  }
}
