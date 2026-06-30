import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMqTopologyService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RabbitMqTopologyService.name);

  async onApplicationBootstrap() {
    if (process.env.IS_WORKER === 'true') {
      await this.initializeTopology();
    }
  }

  async initializeTopology() {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
    let connection: any;
    try {
      connection = await amqp.connect(url);
    } catch (error: any) {
      this.logger.error(`Failed to connect to RabbitMQ for topology initialization: ${error.message}`);
      throw error; // Worker must fail if topology cannot be initialized
    }

    try {
      const channel = await connection.createChannel();
      
      const exchange = 'ledgerflow.events';
      const dlx = 'ledgerflow.dlx';

      await channel.assertExchange(exchange, 'topic', { durable: true });
      await channel.assertExchange(dlx, 'topic', { durable: true });

      // Commands Queues
      await this.assertAndBindQueue(channel, 'ledgerflow.payment.commands.q', exchange, 'payment.command.*', dlx, 'payment.dlq');
      await this.assertAndBindQueue(channel, 'ledgerflow.webhooks.commands.q', exchange, 'webhook.command.*', dlx, 'webhook.dlq');

      // Retry Queues
      const retryIntervals = [30000, 120000, 600000, 1800000]; // 30s, 2m, 10m, 30m
      const retryNames = ['30s', '2m', '10m', '30m'];

      for (let i = 0; i < retryIntervals.length; i++) {
        const ttl = retryIntervals[i];
        const name = retryNames[i];

        await channel.assertQueue(`ledgerflow.payment.retry.${name}.q`, {
          durable: true,
          deadLetterExchange: exchange,
          deadLetterRoutingKey: 'payment.command.retry',
          messageTtl: ttl,
        });

        await channel.assertQueue(`ledgerflow.webhooks.retry.${name}.q`, {
          durable: true,
          deadLetterExchange: exchange,
          deadLetterRoutingKey: 'webhook.command.retry',
          messageTtl: ttl,
        });
      }

      // DLQs
      await channel.assertQueue('ledgerflow.payment.dlq', { durable: true });
      await channel.bindQueue('ledgerflow.payment.dlq', dlx, 'payment.dlq');
      
      await channel.assertQueue('ledgerflow.webhooks.dlq', { durable: true });
      await channel.bindQueue('ledgerflow.webhooks.dlq', dlx, 'webhook.dlq');

      await channel.close();
      await connection.close();
      this.logger.log('rabbitmq.topology.initialized');
    } catch (error: any) {
      this.logger.error(`Failed to initialize RabbitMQ topology: ${error.message}`);
      throw error;
    }
  }

  private async assertAndBindQueue(channel: any, queue: string, exchange: string, routingKey: string, dlx: string, dlqRoutingKey: string) {
    await channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: dlx,
      deadLetterRoutingKey: dlqRoutingKey,
    });
    await channel.bindQueue(queue, exchange, routingKey);
  }
}
