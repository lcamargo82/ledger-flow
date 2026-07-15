import { ChannelInventorySyncStatus, ChannelProvider } from '@prisma/client';
import { PrismaChannelsRepository } from './prisma-channels.repository';

describe('PrismaChannelsRepository inventory sync identities', () => {
  const prisma = {
    channelInventorySyncState: {
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
});
