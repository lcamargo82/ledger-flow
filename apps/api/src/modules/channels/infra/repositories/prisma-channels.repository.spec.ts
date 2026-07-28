import { ChannelInventorySyncStatus, ChannelProvider } from '@prisma/client';
import { PrismaChannelsRepository } from './prisma-channels.repository';

describe('PrismaChannelsRepository inventory sync identities', () => {
  const prisma = {
    channelInventorySyncState: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    channelListing: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    productSku: { findMany: jest.fn() },
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns tenant-scoped product and readable SKU data without replacing internal identity', async () => {
    prisma.channelInventorySyncState.findMany.mockResolvedValue([
      {
        id: 'sync-1',
        tenantId: 'tenant-1',
        skuId: 'sku-uuid-1',
        provider: ChannelProvider.MERCADO_LIVRE,
        status: ChannelInventorySyncStatus.PENDING,
      },
    ]);
    prisma.channelInventorySyncState.count.mockResolvedValue(1);
    prisma.productSku.findMany.mockResolvedValue([
      {
        id: 'sku-uuid-1',
        skuCanonical: 'CONTROLLER-GAMEPAD',
        skuDisplay: 'CONTROLLER-GAMEPAD',
        product: { name: 'Controle Gamepad Wireless' },
      },
    ]);
    const repository = new PrismaChannelsRepository(prisma as never);

    const result = await repository.listInventorySyncStates({ tenantId: 'tenant-1' });

    expect(prisma.productSku.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', id: { in: ['sku-uuid-1'] } },
      }),
    );
    expect(result.data[0]).toMatchObject({
      skuId: 'sku-uuid-1',
      sku: {
        skuDisplay: 'CONTROLLER-GAMEPAD',
        product: { name: 'Controle Gamepad Wireless' },
      },
    });
  });

  it('enriches listing candidates with tenant-scoped readable product and SKU data', async () => {
    prisma.channelListing.findMany.mockResolvedValue([
      {
        id: 'listing-1',
        tenantId: 'tenant-1',
        candidateSkuIds: ['sku-uuid-1'],
      },
    ]);
    prisma.channelListing.count.mockResolvedValue(1);
    prisma.productSku.findMany.mockResolvedValue([
      {
        id: 'sku-uuid-1',
        skuCanonical: 'CONTROLLER-GAMEPAD',
        skuDisplay: 'CONTROLLER-GAMEPAD',
        product: { name: 'Controle Gamepad Wireless' },
      },
    ]);
    const repository = new PrismaChannelsRepository(prisma as never);

    const result = await repository.listListings({ tenantId: 'tenant-1' });

    expect(prisma.productSku.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', id: { in: ['sku-uuid-1'] } },
      }),
    );
    expect(result.data[0]).toMatchObject({
      candidateSkus: [
        {
          id: 'sku-uuid-1',
          skuDisplay: 'CONTROLLER-GAMEPAD',
          product: { name: 'Controle Gamepad Wireless' },
        },
      ],
    });
  });

  it('searches tenant listings by external identity and readable product or SKU fields', async () => {
    prisma.channelListing.findMany.mockResolvedValue([]);
    prisma.channelListing.count.mockResolvedValue(0);
    const repository = new PrismaChannelsRepository(prisma as never);

    await repository.listListings({ tenantId: 'tenant-1', search: 'game-r365' });

    const expectedWhere = {
      tenantId: 'tenant-1',
      provider: undefined,
      matchStatus: undefined,
      OR: [
        { externalListingId: { contains: 'game-r365', mode: 'insensitive' } },
        { externalUserProductId: { contains: 'game-r365', mode: 'insensitive' } },
        { title: { contains: 'game-r365', mode: 'insensitive' } },
        { externalSku: { contains: 'game-r365', mode: 'insensitive' } },
        { matchedSku: { skuCanonical: { contains: 'game-r365', mode: 'insensitive' } } },
        { matchedSku: { skuDisplay: { contains: 'game-r365', mode: 'insensitive' } } },
        {
          matchedSku: { product: { name: { contains: 'game-r365', mode: 'insensitive' } } },
        },
      ],
    };
    expect(prisma.channelListing.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      skip: 0,
      take: 10,
      orderBy: { importedAt: 'desc' },
    });
    expect(prisma.channelListing.count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('lists active tenant SKU options by readable product or SKU search', async () => {
    prisma.productSku.findMany.mockResolvedValue([]);
    const repository = new PrismaChannelsRepository(prisma as never);

    await repository.listSkuOptions({
      tenantId: 'tenant-1',
      search: 'gamepad',
      limit: 50,
    });

    expect(prisma.productSku.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        product: { status: 'ACTIVE' },
        OR: [
          { product: { name: { contains: 'gamepad', mode: 'insensitive' } } },
          { skuCanonical: { contains: 'GAMEPAD', mode: 'insensitive' } },
          { skuDisplay: { contains: 'gamepad', mode: 'insensitive' } },
          { barcode: { contains: 'gamepad', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        skuCanonical: true,
        skuDisplay: true,
        product: { select: { name: true } },
      },
      take: 50,
      orderBy: [{ product: { name: 'asc' } }, { skuDisplay: 'asc' }],
    });
  });

  it('only returns matched listings from integrations with inventory sync explicitly enabled', async () => {
    prisma.channelListing.findMany.mockResolvedValue([]);
    const repository = new PrismaChannelsRepository(prisma as never);

    await repository.findSyncableListingsBySku('tenant-1', 'sku-1');

    expect(prisma.channelListing.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        matchedSkuId: 'sku-1',
        matchStatus: 'MATCHED',
        integration: {
          status: 'ACTIVE',
          settingsJson: {
            path: ['syncEnabled'],
            equals: true,
          },
        },
      },
      select: {
        id: true,
        tenantId: true,
        integrationId: true,
        provider: true,
        externalListingId: true,
        externalUserProductId: true,
        matchedSkuId: true,
      },
    });
  });
});
