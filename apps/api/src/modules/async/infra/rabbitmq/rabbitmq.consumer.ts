import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as amqp from 'amqplib';
import { AsyncHandlerRegistryService } from '../../application/services/async-handler-registry.service';
import { AsyncMessageEnvelope } from '../../domain/entities/async-message-envelope';

@Injectable()
export class RabbitMQConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private connection: any = null;
  private channel: any = null;

  constructor(private readonly registry: AsyncHandlerRegistryService) {}

  async onApplicationBootstrap() {
    // Only start if we are in the worker context
    if (process.env.IS_WORKER === 'true') {
      await this.connect();
    }
  }

  private async connect() {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
    const prefetchCount = Number(process.env.RABBITMQ_PREFETCH) || 10;
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(prefetchCount);
      this.logger.log('Connected to RabbitMQ (Consumer)');
      
      this.consume('ledgerflow.payment.commands.q');
      this.consume('ledgerflow.webhooks.commands.q');
    } catch (err: any) {
      this.logger.error(`Failed to connect to RabbitMQ consumer: ${err.message}`);
    }
  }

  private async consume(queue: string) {
    if (!this.channel) return;
    
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      
      try {
        const payload = JSON.parse(msg.content.toString()) as AsyncMessageEnvelope;
        const handlers = this.registry.getHandlers(payload.eventType);
        
        for (const handler of handlers) {
          try {
             await handler.handle(payload);
          } catch (e: any) {
             this.logger.error(`Handler ${handler.consumerName} failed: ${e.message}`);
             // In real implementation, handle retries / NACK here
             // Using simple ack for now to prevent infinite loops in mock
             // Actual implementation would check if it's RetryableError and Nack or Ack based on that
          }
        }
        
        this.channel!.ack(msg);
      } catch (e: any) {
        this.logger.error(`Failed to process message from ${queue}: ${e.message}`);
        this.channel!.reject(msg, false); // Send to DLQ
      }
    });
  }
}
