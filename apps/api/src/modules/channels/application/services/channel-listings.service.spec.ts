import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ChannelIntegrationStatus,
  ChannelListingMatchStatus,
  ChannelProvider,
} from '@prisma/client';
import { ChannelsService } from './channels.service';

describe('ChannelsService listings', () => {
  const channelsRepository = {
    createIntegration: jest.fn(),
    listIntegrations: jest.fn(),
    updateIntegrationStatus: jest.fn(),
    findActiveIntegrationBySecretHash: jest.fn(),
    findIntegrationById: jest.fn(),
    findInboxByProviderEventId: jest.fn(),
    createInboxEvent: jest.fn(),
    listInbox: jest.fn(),
    findSkuMatchCandidates: jest.fn(),
    findListingByExternalId: jest.fn(),
    upsertListing: jest.fn(),
    listListings: jest.fn(),
    findListingById: jest.fn(),
    findSkuById: jest.fn(),
    createManualMappingGroup: jest.fn(),
  };

  const prisma = {
    auditLog: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const mercadoLivreAdapter = {
    fetchListings: jest.fn(),
  };
  const encryptionService = {
    decrypt: jest.fn(),
  };

  const integration = {
    id: 'integration-1',
    tenantId: 'tenant-1',
    provider: ChannelProvider.MOCK,
    name: 'Mock',
    status: ChannelIntegrationStatus.ACTIVE,
    webhookSecretHash: 'hash',
    createdByUserId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    channelsRepository.findIntegrationById.mockResolvedValue(integration);
    channelsRepository.findListingByExternalId.mockResolvedValue(null);
    channelsRepository.upsertListing.mockImplementation(async (data) => ({
      id: `listing-${data.externalListingId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      importedAt: new Date(),
      ignoredAt: null,
      ...data,
    }));
    mercadoLivreAdapter.fetchListings.mockResolvedValue([]);
    encryptionService.decrypt.mockReturnValue({
      accessToken: 'ml-access-token',
      externalAccountId: 'seller-123',
    });
  });

  it('imports mock listings and classifies safe matches only', async () => {
    channelsRepository.findSkuMatchCandidates
      .mockResolvedValueOnce([{ id: 'sku-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'sku-2' }, { id: 'sku-3' }]);

    const service = new ChannelsService(channelsRepository as never, prisma as never);

    const result = await service.importListings('integration-1', 'tenant-1', 'user-1', {
      listings: [
        { externalListingId: 'ext-1', title: 'Matched', externalSku: 'SKU-1' },
        { externalListingId: 'ext-2', title: 'Missing SKU' },
        { externalListingId: 'ext-3', title: 'Unknown SKU', externalSku: 'UNKNOWN' },
        { externalListingId: 'ext-4', title: 'Ambiguous SKU', externalSku: 'SKU' },
      ],
    });

    expect(channelsRepository.upsertListing).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        externalListingId: 'ext-1',
        matchStatus: ChannelListingMatchStatus.MATCHED,
        matchedSkuId: 'sku-1',
      }),
    );
    expect(channelsRepository.upsertListing).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        externalListingId: 'ext-2',
        matchStatus: ChannelListingMatchStatus.UNMATCHED,
        matchedSkuId: null,
      }),
    );
    expect(channelsRepository.upsertListing).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        externalListingId: 'ext-3',
        matchStatus: ChannelListingMatchStatus.UNMATCHED,
        matchedSkuId: null,
      }),
    );
    expect(channelsRepository.upsertListing).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        externalListingId: 'ext-4',
        matchStatus: ChannelListingMatchStatus.AMBIGUOUS,
        matchedSkuId: null,
        candidateSkuIds: ['sku-2', 'sku-3'],
      }),
    );
    expect(result.summary).toEqual({
      imported: 4,
      matched: 1,
      unmatched: 2,
      ambiguous: 1,
      ignored: 0,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'channels.listings.imported',
          entityId: 'integration-1',
        }),
      }),
    );
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'channel.listing.import.completed',
          aggregateId: 'integration-1',
        }),
      }),
    );
  });

  it('imports Mercado Livre listings through the adapter and reuses SKU classification', async () => {
    channelsRepository.findIntegrationById.mockResolvedValueOnce({
      ...integration,
      provider: ChannelProvider.MERCADO_LIVRE,
      externalAccountId: 'seller-123',
      encryptedCredentials: {
        version: 1,
        algorithm: 'aes-256-gcm',
        ciphertext: 'ciphertext',
      },
    });
    mercadoLivreAdapter.fetchListings.mockResolvedValueOnce([
      {
        externalListingId: 'MLB-1',
        externalUserProductId: 'MLBU4292355491',
        title: 'Produto casado',
        externalSku: 'SKU-1',
        metadata: { providerStatus: 'active' },
      },
      {
        externalListingId: 'MLB-2',
        title: 'Produto sem SKU',
        metadata: { providerStatus: 'paused' },
      },
    ]);
    channelsRepository.findSkuMatchCandidates.mockResolvedValueOnce([{ id: 'sku-1' }]);
    const service = new ChannelsService(
      channelsRepository as never,
      prisma as never,
      mercadoLivreAdapter as never,
      encryptionService as never,
    );

    const result = await service.importListings('integration-1', 'tenant-1', 'user-1', {
      maxPages: 2,
      pageSize: 50,
    });

    expect(encryptionService.decrypt).toHaveBeenCalledWith(
      JSON.stringify({
        version: 1,
        algorithm: 'aes-256-gcm',
        ciphertext: 'ciphertext',
      }),
    );
    expect(mercadoLivreAdapter.fetchListings).toHaveBeenCalledWith({
      accessToken: 'ml-access-token',
      externalAccountId: 'seller-123',
      maxPages: 2,
      pageSize: 50,
    });
    expect(channelsRepository.upsertListing).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        provider: ChannelProvider.MERCADO_LIVRE,
        externalListingId: 'MLB-1',
        externalUserProductId: 'MLBU4292355491',
        matchStatus: ChannelListingMatchStatus.MATCHED,
        matchedSkuId: 'sku-1',
      }),
    );
    expect(channelsRepository.upsertListing).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        provider: ChannelProvider.MERCADO_LIVRE,
        externalListingId: 'MLB-2',
        matchStatus: ChannelListingMatchStatus.UNMATCHED,
        matchedSkuId: null,
      }),
    );
    expect(result.summary).toEqual({
      imported: 2,
      matched: 1,
      unmatched: 1,
      ambiguous: 0,
      ignored: 0,
    });
    expect(JSON.stringify(prisma.auditLog.create.mock.calls)).not.toContain('ml-access-token');
  });

  it('preserves a valid manual mapping when listings are imported again', async () => {
    channelsRepository.findListingByExternalId.mockResolvedValueOnce({
      id: 'listing-1',
      tenantId: 'tenant-1',
      integrationId: 'integration-1',
      externalListingId: 'ext-1',
      matchStatus: ChannelListingMatchStatus.MATCHED,
      matchedSkuId: 'sku-manual',
      candidateSkuIds: null,
    });
    const service = new ChannelsService(channelsRepository as never, prisma as never);

    await service.importListings('integration-1', 'tenant-1', 'user-1', {
      listings: [{ externalListingId: 'ext-1', title: 'Produto', externalSku: 'OUTRO-SKU' }],
    });

    expect(channelsRepository.findSkuMatchCandidates).not.toHaveBeenCalled();
    expect(channelsRepository.upsertListing).toHaveBeenCalledWith(
      expect.objectContaining({
        externalListingId: 'ext-1',
        matchStatus: ChannelListingMatchStatus.MATCHED,
        matchedSkuId: 'sku-manual',
      }),
    );
  });

  it('rejects import for disabled or missing integrations', async () => {
    channelsRepository.findIntegrationById.mockResolvedValueOnce(null);
    const service = new ChannelsService(channelsRepository as never, prisma as never);

    await expect(
      service.importListings('integration-missing', 'tenant-1', 'user-1', { listings: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);

    channelsRepository.findIntegrationById.mockResolvedValueOnce({
      ...integration,
      status: ChannelIntegrationStatus.DISABLED,
    });

    await expect(
      service.importListings('integration-1', 'tenant-1', 'user-1', { listings: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps a listing manually inside the tenant and writes audit log', async () => {
    channelsRepository.findListingById.mockResolvedValue({
      id: 'listing-1',
      tenantId: 'tenant-1',
      integrationId: 'integration-1',
      provider: ChannelProvider.MOCK,
      externalUserProductId: 'MLBU-1',
    });
    channelsRepository.findSkuById.mockResolvedValue({ id: 'sku-1', tenantId: 'tenant-1' });
    channelsRepository.createManualMappingGroup.mockResolvedValue({
      id: 'listing-1',
      matchStatus: ChannelListingMatchStatus.MATCHED,
      matchedSkuId: 'sku-1',
    });
    const service = new ChannelsService(channelsRepository as never, prisma as never);

    const listing = await service.mapListing('listing-1', 'tenant-1', 'user-1', {
      skuId: 'sku-1',
      reason: 'Conferido manualmente',
    });

    expect(listing.matchedSkuId).toBe('sku-1');
    expect(channelsRepository.createManualMappingGroup).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      listingId: 'listing-1',
      integrationId: 'integration-1',
      externalUserProductId: 'MLBU-1',
      skuId: 'sku-1',
      actorUserId: 'user-1',
      reason: 'Conferido manualmente',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'channels.listing.mapped',
          entityType: 'ChannelListing',
          entityId: 'listing-1',
        }),
      }),
    );
  });

  it('rejects manual mapping when listing or SKU do not belong to the tenant', async () => {
    channelsRepository.findListingById.mockResolvedValueOnce(null);
    const service = new ChannelsService(channelsRepository as never, prisma as never);

    await expect(
      service.mapListing('listing-1', 'tenant-1', 'user-1', { skuId: 'sku-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    channelsRepository.findListingById.mockResolvedValueOnce({ id: 'listing-1' });
    channelsRepository.findSkuById.mockResolvedValueOnce(null);

    await expect(
      service.mapListing('listing-1', 'tenant-1', 'user-1', { skuId: 'sku-missing' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
