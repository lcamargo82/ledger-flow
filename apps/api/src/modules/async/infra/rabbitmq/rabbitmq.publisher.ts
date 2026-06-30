import { Injectable, Logger } from '@nestjs/common';
import { AsyncMessagePublisher } from '../../domain/interfaces/async-message-publisher.interface';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQPublisher implements AsyncMessagePublisher {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.ConfirmChannel | null = null;

  async connect() {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createConfirmChannel();
      this.logger.log('Connected to RabbitMQ (Publisher)');
      await this.setupTopology();
    } catch (err: any) {
      this.logger.error(\`Failed to connect to RabbitMQ: \${err.message}\`);
    }
  }

  private async setupTopology() {
    if (!this.channel) return;
    const exchange = 'ledgerflow.events';
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    
    const dlx = 'ledgerflow.dlx';
    await this.channel.assertExchange(dlx, 'topic', { durable: true });

    // Setup basic queues
    const paymentQueue = 'ledgerflow.payment.commands.q';
    await this.channel.assertQueue(paymentQueue, {
      durable: true,
      deadLetterExchange: dlx,
      deadLetterRoutingKey: 'payment.dlq',
    });
    await this.channel.bindQueue(paymentQueue, exchange, 'payment.command.*');

    const webhookQueue = 'ledgerflow.webhooks.commands.q';
    await this.channel.assertQueue(webhookQueue, {
      durable: true,
      deadLetterExchange: dlx,
      deadLetterRoutingKey: 'webhook.dlq',
    });
    await this.channel.bindQueue(webhookQueue, exchange, 'webhook.command.*');

    // Dead letter queues
    await this.channel.assertQueue('ledgerflow.payment.dlq', { durable: true });
    await this.channel.bindQueue('ledgerflow.payment.dlq', dlx, 'payment.dlq');
    
    await this.channel.assertQueue('ledgerflow.webhooks.dlq', { durable: true });
    await this.channel.bindQueue('ledgerflow.webhooks.dlq', dlx, 'webhook.dlq');
  }

  async publish(routingKey: string, payload: any): Promise<boolean> {
    if (!this.channel) {
      await this.connect();
    }
    if (!this.channel) return false;

    return new Promise((resolve, reject) => {
      const exchange = 'ledgerflow.events';
      const content = Buffer.from(JSON.stringify(payload));
      
      const mappedRoutingKey = this.mapRoutingKey(routingKey);

      this.channel!.publish(exchange, mappedRoutingKey, content, { persistent: true }, (err, ok) => {
        if (err !== null) {
          this.logger.error(\`Publisher confirm failed for \${mappedRoutingKey}\`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  private mapRoutingKey(eventType: string): string {
    if (eventType.startsWith('payment.provider_charge_creation_requested')) return 'payment.command.create-charge';
    if (eventType.startsWith('webhook.inbound_processing_requested')) return 'webhook.command.process';
    return eventType;
  }
}
