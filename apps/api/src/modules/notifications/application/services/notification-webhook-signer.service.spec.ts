import { createHmac } from 'crypto';
import { NotificationWebhookSignerService } from './notification-webhook-signer.service';

describe('NotificationWebhookSignerService', () => {
  it('signs timestamp dot raw body with HMAC-SHA256', () => {
    const service = new NotificationWebhookSignerService();
    const rawBody = '{"id":"event-1","type":"notification.created"}';
    const timestamp = 1_725_000_000;
    const expected = createHmac('sha256', 'secret-123')
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    expect(service.sign(rawBody, 'secret-123', timestamp)).toEqual({
      timestamp: String(timestamp),
      signature: `v1=${expected}`,
    });
  });
});
