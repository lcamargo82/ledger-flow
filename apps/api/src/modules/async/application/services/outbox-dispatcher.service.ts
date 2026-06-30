import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { OutboxRepository } from '../../domain/interfaces/outbox.repository';
import { AsyncMessagePublisher } from '../../domain/interfaces/async-message-publisher.interface';
import { AsyncMessageEnvelope } from '../../domain/entities/async-message-envelope';
import { randomUUID } from 'crypto';

@Injectable()
export class OutboxDispatcherService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private readonly dispatcherId = randomUUID();
  private readonly batchSize = Number(process.env.OUTBOX_DISPATCH_BATCH_SIZE) || 50;
  private readonly intervalMs = Number(process.env.OUTBOX_DISPATCH_INTERVAL_MS) || 2000;
  private readonly leaseDurationMs = (Number(process.env.OUTBOX_LEASE_DURATION_SECONDS) || 60) * 1000;
  private isProcessing = false;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly messagePublisher: AsyncMessagePublisher,
  ) {}

  onApplicationBootstrap() {
    this.logger.log(`outbox.dispatcher.started (ID: ${this.dispatcherId})`);
    this.startPolling();
  }

  onApplicationShutdown() {
    this.isShuttingDown = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private startPolling() {
    this.timer = setTimeout(async () => {
      if (!this.isShuttingDown) {
        await this.processOutbox();
        this.startPolling();
      }
    }, this.intervalMs);
  }

  private async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = await this.outboxRepository.findPendingAndLock(this.batchSize, this.dispatcherId, this.leaseDurationMs);
      
      if (events.length > 0) {
        this.logger.debug(`Found ${events.length} outbox events to dispatch`);
      }

      for (const event of events) {
        try {
          const envelope: AsyncMessageEnvelope = {
            messageId: event.id,
            eventType: event.eventType,
            eventVersion: event.eventVersion,
            tenantId: event.tenantId || undefined,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            traceId: event.traceId || undefined,
            occurredAt: event.createdAt.toISOString(),
          };

          const routingKey = event.eventType;
          
          const published = await this.messagePublisher.publish(routingKey, envelope);
          
          if (published) {
            await this.outboxRepository.markAsPublished(event.id);
            this.logger.debug(`Successfully published outbox event ${event.id}`);
          } else {
            this.logger.warn(`Failed to publish outbox event ${event.id}, releasing lock`);
            await this.outboxRepository.releaseLock(event.id);
          }
        } catch (error: any) {
          this.logger.error(`Error dispatching outbox event ${event.id}: ${error.message}`);
          await this.outboxRepository.releaseLock(event.id);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error processing outbox batch: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
