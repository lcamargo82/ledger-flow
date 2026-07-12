import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class NotificationWebhookSignerService {
  sign(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
    const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');

    return {
      timestamp: String(timestamp),
      signature: `v1=${digest}`,
    };
  }
}
