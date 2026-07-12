import { BadRequestException } from '@nestjs/common';
import { NotificationWebhookEndpointPolicyService } from './notification-webhook-endpoint-policy.service';

describe('NotificationWebhookEndpointPolicyService', () => {
  const resolver = { resolve: jest.fn() };
  let service: NotificationWebhookEndpointPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationWebhookEndpointPolicyService(resolver);
  });

  it.each([
    'http://automation.example.com/webhook',
    'https://localhost/webhook',
    'https://127.0.0.1/webhook',
    'https://169.254.169.254/latest/meta-data',
    'https://user:password@automation.example.com/webhook',
  ])('rejects unsafe endpoint %s', async (endpointUrl) => {
    await expect(service.assertSafe(endpointUrl)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects hostnames that resolve to a private address', async () => {
    resolver.resolve.mockResolvedValue(['10.0.0.4']);

    await expect(service.assertSafe('https://internal.example.com/webhook')).rejects.toThrow(
      'Webhook endpoint resolves to a private network.',
    );
  });

  it('normalizes a public HTTPS endpoint', async () => {
    resolver.resolve.mockResolvedValue(['8.8.8.8']);

    await expect(service.assertSafe('https://automation.example.com/webhook')).resolves.toBe(
      'https://automation.example.com/webhook',
    );
  });
});
