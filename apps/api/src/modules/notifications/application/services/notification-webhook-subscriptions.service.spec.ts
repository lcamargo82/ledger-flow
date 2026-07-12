import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationWebhookSubscriptionStatus } from '@prisma/client';
import { NotificationWebhookSubscriptionsService } from './notification-webhook-subscriptions.service';

describe('NotificationWebhookSubscriptionsService', () => {
  const now = new Date('2026-07-11T21:00:00.000Z');
  const stored = {
    id: 'subscription-id',
    tenantId: 'tenant-a',
    name: 'ERP',
    endpointUrl: 'https://erp.example.com/hooks',
    status: NotificationWebhookSubscriptionStatus.ACTIVE,
    eventTypes: ['channel.inventory_sync.failed'],
    encryptedSecretJson: { ciphertext: 'encrypted' },
    secretFingerprint: 'fingerprint-12345678',
    createdByUserId: 'user-id',
    createdAt: now,
    updatedAt: now,
  };
  const prisma = {
    notificationWebhookSubscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const endpointPolicy = { assertSafe: jest.fn() };
  const secrets = { generate: jest.fn() };
  let service: NotificationWebhookSubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationWebhookSubscriptionsService(
      prisma as never,
      endpointPolicy as never,
      secrets as never,
    );
  });

  it('creates a tenant-scoped subscription and exposes the secret only in issuance response', async () => {
    endpointPolicy.assertSafe.mockResolvedValue(stored.endpointUrl);
    secrets.generate.mockReturnValue({
      plaintext: 'one-time-secret',
      encryptedSecretJson: stored.encryptedSecretJson,
      fingerprint: stored.secretFingerprint,
    });
    prisma.notificationWebhookSubscription.create.mockResolvedValue(stored);

    const result = await service.create('tenant-a', 'user-id', {
      name: ' ERP ',
      endpointUrl: stored.endpointUrl,
      eventTypes: stored.eventTypes,
    });

    expect(prisma.notificationWebhookSubscription.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        createdByUserId: 'user-id',
        name: 'ERP',
        endpointUrl: stored.endpointUrl,
        eventTypes: stored.eventTypes,
        encryptedSecretJson: stored.encryptedSecretJson,
        secretFingerprint: stored.secretFingerprint,
      },
    });
    expect(result.secret).toBe('one-time-secret');
    expect(result.subscription).not.toHaveProperty('encryptedSecretJson');
    expect(result.subscription).not.toHaveProperty('secretFingerprint');
    expect(result.subscription.secretFingerprintSuffix).toBe('12345678');
  });

  it('rejects event types outside the closed registry before resolving the endpoint', async () => {
    await expect(
      service.create('tenant-a', 'user-id', {
        name: 'ERP',
        endpointUrl: stored.endpointUrl,
        eventTypes: ['unknown.event'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(endpointPolicy.assertSafe).not.toHaveBeenCalled();
  });

  it('lists only subscriptions selected with the current tenant and sanitizes them', async () => {
    prisma.notificationWebhookSubscription.findMany.mockResolvedValue([stored]);

    const result = await service.list('tenant-a');

    expect(prisma.notificationWebhookSubscription.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result[0]).not.toHaveProperty('encryptedSecretJson');
  });

  it('does not update a subscription belonging to another tenant', async () => {
    prisma.notificationWebhookSubscription.findFirst.mockResolvedValue(null);

    await expect(service.update('tenant-b', stored.id, { name: 'Other' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.notificationWebhookSubscription.update).not.toHaveBeenCalled();
  });

  it('rotates an encrypted secret only after tenant ownership is established', async () => {
    prisma.notificationWebhookSubscription.findFirst.mockResolvedValue(stored);
    secrets.generate.mockReturnValue({
      plaintext: 'rotated-secret',
      encryptedSecretJson: { ciphertext: 'rotated' },
      fingerprint: 'rotated-87654321',
    });
    prisma.notificationWebhookSubscription.update.mockResolvedValue({
      ...stored,
      encryptedSecretJson: { ciphertext: 'rotated' },
      secretFingerprint: 'rotated-87654321',
    });

    const result = await service.rotateSecret('tenant-a', stored.id);

    expect(prisma.notificationWebhookSubscription.findFirst).toHaveBeenCalledWith({
      where: { id: stored.id, tenantId: 'tenant-a' },
    });
    expect(result.secret).toBe('rotated-secret');
    expect(result.subscription.secretFingerprintSuffix).toBe('87654321');
  });
});
