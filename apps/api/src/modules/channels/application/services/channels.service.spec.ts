/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import { ChannelIntegrationStatus, ChannelProvider } from '@prisma/client';
import { ChannelsService } from './channels.service';

describe('ChannelsService', () => {
  const repository = {
    createIntegration: jest.fn(),
    listIntegrations: jest.fn(),
    updateIntegrationStatus: jest.fn(),
    findIntegrationById: jest.fn(),
    findWarehouseById: jest.fn(),
    updateIntegrationSettings: jest.fn(),
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
      externalStoreId: 'store-456',
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
      externalStoreId: 'store-456',
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
          externalStoreId: 'store-456',
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

  it('returns sanitized operational integration data without encrypted credentials', async () => {
    repository.listIntegrations.mockResolvedValue([
      {
        id: 'integration-1',
        tenantId: 'tenant-1',
        provider: ChannelProvider.MERCADO_LIVRE,
        name: 'Mercado Livre seller-1',
        status: ChannelIntegrationStatus.ACTIVE,
        encryptedCredentials: { ciphertext: 'must-not-leak' },
        webhookSecretHash: 'must-not-leak',
        credentialsFingerprint: 'must-not-leak',
        credentialsVersion: 2,
        settingsJson: { syncEnabled: true, stockSyncMode: 'AVAILABLE' },
        defaultWarehouseId: 'warehouse-1',
        lastSuccessfulOperationAt: new Date('2026-07-11T18:00:00.000Z'),
        createdAt: new Date('2026-07-11T17:00:00.000Z'),
        updatedAt: new Date('2026-07-11T18:00:00.000Z'),
      },
    ]);

    const result = await makeService().listIntegrations('tenant-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'integration-1',
        healthStatus: 'HEALTHY',
        requiresReauth: false,
        settings: {
          syncEnabled: true,
          stockSyncMode: 'AVAILABLE',
          importListingsOnConnect: false,
        },
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('ciphertext');
    expect(JSON.stringify(result)).not.toContain('credentialsFingerprint');
    expect(JSON.stringify(result)).not.toContain('webhookSecretHash');
  });

  it('updates operational settings only with a warehouse from the same tenant', async () => {
    repository.findIntegrationById.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      status: ChannelIntegrationStatus.ACTIVE,
      settingsJson: {},
    });
    repository.findWarehouseById.mockResolvedValue({
      id: 'warehouse-1',
      tenantId: 'tenant-1',
      isActive: true,
    });
    repository.updateIntegrationSettings.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      status: ChannelIntegrationStatus.ACTIVE,
      defaultWarehouseId: 'warehouse-1',
      settingsJson: {
        syncEnabled: true,
        stockSyncMode: 'AVAILABLE',
        importListingsOnConnect: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await makeService().updateIntegrationSettings('integration-1', 'tenant-1', 'user-1', {
      defaultWarehouseId: 'warehouse-1',
      syncEnabled: true,
      stockSyncMode: 'AVAILABLE',
      importListingsOnConnect: false,
    });

    expect(repository.findWarehouseById).toHaveBeenCalledWith('warehouse-1', 'tenant-1');
    expect(repository.updateIntegrationSettings).toHaveBeenCalledWith(
      'integration-1',
      'tenant-1',
      expect.objectContaining({ defaultWarehouseId: 'warehouse-1' }),
    );
  });

  it('rejects an inactive or cross-tenant warehouse in channel settings', async () => {
    repository.findIntegrationById.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      status: ChannelIntegrationStatus.ACTIVE,
    });
    repository.findWarehouseById.mockResolvedValue(null);

    await expect(
      makeService().updateIntegrationSettings('integration-1', 'tenant-1', 'user-1', {
        defaultWarehouseId: 'warehouse-other-tenant',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateIntegrationSettings).not.toHaveBeenCalled();
  });

  it('only reactivates a suspended integration that still has credentials', async () => {
    repository.findIntegrationById.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      status: ChannelIntegrationStatus.SUSPENDED,
      encryptedCredentials: { ciphertext: 'encrypted' },
    });
    repository.updateIntegrationStatus.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      status: ChannelIntegrationStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await makeService().reactivateIntegration('integration-1', 'tenant-1', 'user-1');

    expect(repository.updateIntegrationStatus).toHaveBeenCalledWith(
      'integration-1',
      'tenant-1',
      ChannelIntegrationStatus.ACTIVE,
    );
  });
});
