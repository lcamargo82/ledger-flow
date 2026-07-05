import { BadRequestException } from '@nestjs/common';
import { ChannelIntegrationStatus, ChannelProvider } from '@prisma/client';
import { ChannelsService } from './channels.service';

describe('ChannelsService', () => {
  const repository = {
    createIntegration: jest.fn(),
    listIntegrations: jest.fn(),
    updateIntegrationStatus: jest.fn(),
  };
  const prisma = {
    auditLog: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.createIntegration.mockImplementation((data) =>
      Promise.resolve({
        id: 'integration-1',
        status: ChannelIntegrationStatus.INACTIVE,
        createdAt: new Date('2026-07-04T10:00:00.000Z'),
        updatedAt: new Date('2026-07-04T10:00:00.000Z'),
        ...data,
      }),
    );
  });

  function makeService() {
    return new ChannelsService(repository as never, prisma as never);
  }

  it('creates Mercado Livre integrations from panel settings without requiring tenant tokens in env', async () => {
    const service = makeService();

    const integration = await service.createIntegration('tenant-1', 'user-1', {
      provider: ChannelProvider.MERCADO_LIVRE,
      name: 'Conta principal ML',
      externalAccountId: 'seller-123',
      displayName: 'Mercado Livre Principal',
      defaultWarehouseId: 'warehouse-1',
      settingsJson: {
        importListingsEnabled: true,
        locale: 'pt-BR',
      },
      syncPolicyJson: {
        stockSyncEnabled: false,
        maxPagesPerRun: 2,
      },
    });

    expect(repository.createIntegration).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      name: 'Conta principal ML',
      externalAccountId: 'seller-123',
      displayName: 'Mercado Livre Principal',
      defaultWarehouseId: 'warehouse-1',
      settingsJson: {
        importListingsEnabled: true,
        locale: 'pt-BR',
      },
      syncPolicyJson: {
        stockSyncEnabled: false,
        maxPagesPerRun: 2,
      },
      status: ChannelIntegrationStatus.INACTIVE,
      webhookSecretHash: null,
      createdByUserId: 'user-1',
    });
    expect(integration.status).toBe(ChannelIntegrationStatus.INACTIVE);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'channels.integration.created',
        metadata: {
          provider: ChannelProvider.MERCADO_LIVRE,
          name: 'Conta principal ML',
          externalAccountId: 'seller-123',
          displayName: 'Mercado Livre Principal',
          hasSettings: true,
          hasSyncPolicy: true,
        },
      }),
    });
  });

  it('rejects tenant scoped channel secrets inside panel settings', async () => {
    const service = makeService();

    await expect(
      service.createIntegration('tenant-1', 'user-1', {
        provider: ChannelProvider.MERCADO_LIVRE,
        name: 'Conta com token indevido',
        settingsJson: {
          accessToken: 'tenant-access-token',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createIntegration).not.toHaveBeenCalled();
  });
});
