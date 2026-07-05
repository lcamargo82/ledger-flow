import { BadRequestException } from '@nestjs/common';
import { ChannelProvider } from '@prisma/client';
import { ChannelWebhooksController } from './channel-webhooks.controller';

describe('ChannelWebhooksController', () => {
  const intakeService = {
    ingest: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts Mercado Livre webhook slug and forwards the enum provider', async () => {
    intakeService.ingest.mockResolvedValue({ id: 'inbox-1', status: 'RECEIVED' });
    const controller = new ChannelWebhooksController(intakeService as never);
    const payload = {
      topic: 'orders_v2',
      resource: '/orders/2000000001',
      user_id: 123456,
      application_id: 987654,
    };

    const result = await controller.ingest('mercado-livre', undefined, payload);

    expect(result).toEqual({ id: 'inbox-1', status: 'RECEIVED' });
    expect(intakeService.ingest).toHaveBeenCalledWith(
      ChannelProvider.MERCADO_LIVRE,
      undefined,
      payload,
    );
  });

  it('keeps enum-compatible provider paths working for secret-based channels', async () => {
    intakeService.ingest.mockResolvedValue({ id: 'inbox-1', status: 'RECEIVED' });
    const controller = new ChannelWebhooksController(intakeService as never);
    const payload = { eventId: 'evt-1', eventType: 'order.created' };

    await controller.ingest('MOCK', 'secret-token', payload);

    expect(intakeService.ingest).toHaveBeenCalledWith(
      ChannelProvider.MOCK,
      'secret-token',
      payload,
    );
  });

  it('rejects unsupported providers before the intake service', () => {
    const controller = new ChannelWebhooksController(intakeService as never);

    expect(() => controller.ingest('unknown-provider', undefined, {})).toThrow(BadRequestException);
    expect(intakeService.ingest).not.toHaveBeenCalled();
  });
});
