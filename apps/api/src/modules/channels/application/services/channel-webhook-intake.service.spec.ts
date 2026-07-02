import { ForbiddenException } from '@nestjs/common';
import { ChannelProvider, ChannelWebhookStatus } from '@prisma/client';
import { ChannelWebhookIntakeService } from './channel-webhook-intake.service';

describe('ChannelWebhookIntakeService', () => {
  const repository = {
    findActiveIntegrationBySecretHash: jest.fn(),
    findInboxByProviderEventId: jest.fn(),
    createInboxEvent: jest.fn(),
  };

  const prisma = {
    auditLog: {
      create: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  };

  let service: ChannelWebhookIntakeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChannelWebhookIntakeService(repository as never, prisma as never);
  });

  it('persists a valid channel webhook as received with sanitized summary', async () => {
    repository.findActiveIntegrationBySecretHash.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MOCK,
    });
    repository.findInboxByProviderEventId.mockResolvedValue(null);
    repository.createInboxEvent.mockResolvedValue({
      id: 'inbox-1',
      status: ChannelWebhookStatus.RECEIVED,
    });

    const result = await service.ingest(ChannelProvider.MOCK, 'secret-token', {
      eventId: 'evt-1',
      eventType: 'order.created',
      occurredAt: '2026-07-02T13:00:00.000Z',
      order: {
        externalOrderId: 'external-1',
        status: 'paid',
      },
      secret: 'must-not-be-stored',
    });

    expect(repository.createInboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        integrationId: 'integration-1',
        provider: ChannelProvider.MOCK,
        providerEventId: 'evt-1',
        eventType: 'order.created',
        status: ChannelWebhookStatus.RECEIVED,
        payloadSummary: {
          eventId: 'evt-1',
          eventType: 'order.created',
          occurredAt: '2026-07-02T13:00:00.000Z',
          externalOrderId: 'external-1',
          externalStatus: 'paid',
        },
      }),
    );
    expect(
      JSON.stringify(repository.createInboxEvent.mock.calls[0][0].payloadSummary),
    ).not.toContain('must-not-be-stored');
    expect(result.status).toBe(ChannelWebhookStatus.RECEIVED);
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aggregateType: 'ChannelWebhookInboxEvent',
        aggregateId: 'inbox-1',
        eventType: 'channel.webhook.received',
      }),
    });
  });

  it('returns duplicate status without creating another inbox event', async () => {
    repository.findActiveIntegrationBySecretHash.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MOCK,
    });
    repository.findInboxByProviderEventId.mockResolvedValue({
      id: 'inbox-1',
      status: ChannelWebhookStatus.RECEIVED,
    });

    const result = await service.ingest(ChannelProvider.MOCK, 'secret-token', {
      eventId: 'evt-1',
      eventType: 'order.created',
      order: { externalOrderId: 'external-1' },
    });

    expect(repository.createInboxEvent).not.toHaveBeenCalled();
    expect(result.status).toBe(ChannelWebhookStatus.DUPLICATE);
  });

  it('persists invalid payloads as invalid without raw payload storage', async () => {
    repository.findActiveIntegrationBySecretHash.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MOCK,
    });
    repository.findInboxByProviderEventId.mockResolvedValue(null);
    repository.createInboxEvent.mockResolvedValue({
      id: 'inbox-invalid',
      status: ChannelWebhookStatus.INVALID,
    });

    const result = await service.ingest(ChannelProvider.MOCK, 'secret-token', {
      eventType: 'order.created',
      order: { externalOrderId: 'external-1' },
    });

    expect(repository.createInboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        providerEventId: expect.stringContaining('invalid-'),
        status: ChannelWebhookStatus.INVALID,
        failureReason: 'eventId is required',
        payloadSummary: {
          eventType: 'order.created',
          externalOrderId: 'external-1',
        },
      }),
    );
    expect(result.status).toBe(ChannelWebhookStatus.INVALID);
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aggregateType: 'ChannelWebhookInboxEvent',
        aggregateId: 'inbox-invalid',
        eventType: 'channel.webhook.invalid',
      }),
    });
  });

  it('rejects unknown webhook secrets', async () => {
    repository.findActiveIntegrationBySecretHash.mockResolvedValue(null);

    await expect(
      service.ingest(ChannelProvider.MOCK, 'wrong-token', {
        eventId: 'evt-1',
        eventType: 'order.created',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.createInboxEvent).not.toHaveBeenCalled();
  });
});
