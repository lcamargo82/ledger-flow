import { Injectable, Logger } from '@nestjs/common';
import { AsyncMessagePublisher } from '../../domain/interfaces/async-message-publisher.interface';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQPublisher implements AsyncMessagePublisher {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private connection: any = null;
  private channel: any = null;

  async connect() {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createConfirmChannel();

      this.channel.on('return', (msg: any) => {
        this.logger.warn(`Message returned (no route found): ${msg.fields.routingKey}`);
        // Cannot directly fail the original promise here easily without tracking correlationIds,
        // but since we're tracking the failure, we might need a map of pending publishes.
      });

      this.logger.log('Connected to RabbitMQ (Publisher)');
    } catch (err: any) {
      this.logger.error(`Failed to connect to RabbitMQ: ${err.message}`);
    }
  }

  async publish(routingKey: string, payload: any): Promise<boolean> {
    if (!this.channel) {
      await this.connect();
    }
    if (!this.channel) return false;

    return new Promise((resolve, reject) => {
      const exchange = 'ledgerflow.events';
      const content = Buffer.from(JSON.stringify(payload));
      const messageId = payload.messageId;

      const mappedRoutingKey = this.mapRoutingKey(routingKey);

      let wasReturned = false;
      const returnHandler = (msg: any) => {
        if (msg.properties.messageId === messageId) {
          wasReturned = true;
          this.logger.warn(
            `Message returned (unroutable) for ${mappedRoutingKey}, messageId: ${messageId}`,
          );
        }
      };

      this.channel.on('return', returnHandler);

      this.channel!.publish(
        exchange,
        mappedRoutingKey,
        content,
        {
          persistent: true,
          mandatory: true,
          messageId: messageId,
          contentType: 'application/json',
        },
        (err: any, ok: any) => {
          this.channel.removeListener('return', returnHandler);
          if (err !== null) {
            this.logger.error(`Publisher confirm failed for ${mappedRoutingKey}`);
            resolve(false);
          } else {
            if (wasReturned) {
              resolve(false);
            } else {
              resolve(true);
            }
          }
        },
      );
    });
  }

  private mapRoutingKey(eventType: string): string {
    if (eventType.startsWith('payment.provider_charge_creation_requested'))
      return 'payment.command.create-charge';
    if (eventType.startsWith('webhook.inbound_processing_requested'))
      return 'webhook.command.process';
    return eventType;
  }
}
