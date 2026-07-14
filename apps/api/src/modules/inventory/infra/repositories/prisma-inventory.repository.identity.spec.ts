import { PrismaInventoryRepository } from './prisma-inventory.repository';

describe('PrismaInventoryRepository readable identities', () => {
  const page = { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) };
  const prisma = {
    inventoryBalance: page,
    inventoryMovement: page,
    inventoryReservation: page,
    inventoryTransfer: page,
    cycleCount: page,
  };
  const repository = new PrismaInventoryRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['balance', () => repository.listBalances({ tenantId: 'tenant-1' }), 'inventoryBalance'],
    ['movement', () => repository.listMovements({ tenantId: 'tenant-1' }), 'inventoryMovement'],
    [
      'reservation',
      () => repository.listReservations({ tenantId: 'tenant-1' }),
      'inventoryReservation',
    ],
  ])('loads product, SKU and warehouse for %s rows', async (_name, call, model) => {
    await call();
    expect(prisma[model as keyof typeof prisma].findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          sku: { select: { skuDisplay: true, product: { select: { name: true } } } },
          warehouse: { select: { name: true, code: true } },
        },
      }),
    );
  });

  it('loads readable warehouses and item identities for transfers', async () => {
    await repository.listTransfers({ tenantId: 'tenant-1' });
    expect(prisma.inventoryTransfer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          sourceWarehouse: { select: { name: true, code: true } },
          destinationWarehouse: { select: { name: true, code: true } },
          items: {
            include: {
              sku: { select: { skuDisplay: true, product: { select: { name: true } } } },
            },
          },
        }),
      }),
    );
  });

  it('loads readable warehouse and item identities for cycle counts', async () => {
    await repository.listCycleCounts({ tenantId: 'tenant-1' });
    expect(prisma.cycleCount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          warehouse: { select: { name: true, code: true } },
          items: {
            include: {
              sku: { select: { skuDisplay: true, product: { select: { name: true } } } },
            },
          },
        }),
      }),
    );
  });
});
