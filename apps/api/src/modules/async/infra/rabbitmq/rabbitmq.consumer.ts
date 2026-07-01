import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as amqp from 'amqplib';
import { AsyncHandlerRegistryService } from '../../application/services/async-handler-registry.service';
import { AsyncMessageEnvelope } from '../../domain/entities/async-message-envelope';
import { AsyncJobExecutionRepository } from '../../domain/interfaces/async-job-execution.repository';
import { OutboxRepository } from '../../domain/interfaces/outbox.repository';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { AsyncJobStatus } from '@prisma/client';
import { RabbitMqTopologyService } from './rabbitmq-topology.service';

@Injectable()
export class RabbitMQConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private connection: any = null;
  private channel: any = null;

  constructor(
    private readonly registry: AsyncHandlerRegistryService,
    private readonly jobExecutionRepo: AsyncJobExecutionRepository,
    private readonly topologyService: RabbitMqTopologyService,
    private readonly outboxRepo: OutboxRepository,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.APP_PROCESS_ROLE === 'worker') {
      await this.connect();
    }
  }

  private async connect() {
    await this.topologyService.initializeTopology();

    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
    const prefetchCount = Number(process.env.RABBITMQ_PREFETCH) || 10;
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(prefetchCount);
      this.logger.log('rabbitmq.connected');
      this.logger.log('rabbitmq.consumer.registered');

      this.consume('ledgerflow.payment.commands.q');
      this.consume('ledgerflow.webhooks.commands.q');
    } catch (err: any) {
      this.logger.error(
        `Failed to connect to RabbitMQ consumer: ${err.message}`,
      );
    }
  }

  private async consume(queue: string) {
    if (!this.channel) return;

    await this.channel.consume(queue, async (msg: any) => {
      if (!msg) return;

      const contentStr = msg.content.toString();
      let payload: AsyncMessageEnvelope;
      try {
        payload = JSON.parse(contentStr);
      } catch (e) {
        this.logger.error(
          `Failed to parse message from ${queue}: ${contentStr}`,
        );
        this.channel.reject(msg, false); // DLQ
        return;
      }

      const handlers = this.registry.getHandlers(payload.eventType);

      if (handlers.length === 0) {
        this.logger.warn(
          `No handlers found for eventType: ${payload.eventType}`,
        );
        this.channel.reject(msg, false);
        return;
      }

      // Validations based on instructions
      const outboxEvent = await this.outboxRepo.findById(payload.messageId);
      if (!outboxEvent) {
        this.logger.error(
          `OutboxEvent not found: ${payload.messageId}, ignoring payload.`,
        );
        this.channel.ack(msg); // Safely ack as permanent failure
        return;
      }

      if (outboxEvent.tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: outboxEvent.tenantId },
        });

        if (!tenant) {
          this.logger.error(
            `Tenant not found for outbox event: ${outboxEvent.tenantId}, marking as failed.`,
          );
          this.channel.ack(msg); // Prevent infinite loop of P2003
          return;
        }
      }

      for (const handler of handlers) {
        // Create job execution
        const jobExecution = await this.jobExecutionRepo.createOrUpdate({
          tenantId: outboxEvent.tenantId || null,
          outboxEventId: payload.messageId,
          consumerName: handler.consumerName,
          status: AsyncJobStatus.PROCESSING,
          attemptCount: 1,
          startedAt: new Date(),
        });

        try {
          await handler.handle(payload);
          await this.jobExecutionRepo.createOrUpdate({
            id: jobExecution.id,
            status: AsyncJobStatus.SUCCEEDED,
            completedAt: new Date(),
          });
        } catch (e: any) {
          this.logger.error(
            `Handler ${handler.consumerName} failed: ${e.message}`,
          );

          await this.jobExecutionRepo.createOrUpdate({
            id: jobExecution.id,
            status: AsyncJobStatus.FAILED,
            lastErrorCode: e.name,
            lastErrorSummary: e.message,
            attemptCount: jobExecution.attemptCount + 1,
            completedAt: new Date(),
          });

          // Basic logic: Reject to DLQ if we don't handle advanced retry dynamically
          this.channel.reject(msg, false);
          return;
        }
      }

      this.channel.ack(msg);
    });
  }
}
