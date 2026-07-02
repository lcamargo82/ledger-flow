import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryMovementType } from '@prisma/client';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  const repository = {
    findWarehouseByCode: jest.fn(),
    createWarehouse: jest.fn(),
    findWarehouseById: jest.fn(),
    updateWarehouse: jest.fn(),
    listWarehouses: jest.fn(),
    findSkuById: jest.fn(),
    recordAdjustment: jest.fn(),
    listBalances: jest.fn(),
    listMovements: jest.fn(),
  };

  const prisma = {
    auditLog: {
      create: jest.fn(),
    },
  };

  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(repository as never, prisma as never);
  });

  it('creates a warehouse with normalized code and audit log', async () => {
    repository.findWarehouseByCode.mockResolvedValue(null);
    repository.createWarehouse.mockResolvedValue({
      id: 'warehouse-1',
      code: 'MAIN',
      name: 'Principal',
      isActive: true,
    });

    const warehouse = await service.createWarehouse('tenant-1', 'user-1', {
      code: ' main ',
      name: 'Principal',
    });

    expect(repository.createWarehouse).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      code: 'MAIN',
      name: 'Principal',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'inventory.warehouse.created',
        entityType: 'Warehouse',
        entityId: 'warehouse-1',
      }),
    });
    expect(warehouse.id).toBe('warehouse-1');
  });

  it('rejects duplicated warehouse code inside the same tenant', async () => {
    repository.findWarehouseByCode.mockResolvedValue({ id: 'warehouse-1' });

    await expect(
      service.createWarehouse('tenant-1', 'user-1', {
        code: 'MAIN',
        name: 'Principal',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('records adjustment movement and updates balance projection', async () => {
    repository.findWarehouseById.mockResolvedValue({
      id: 'warehouse-1',
      isActive: true,
    });
    repository.findSkuById.mockResolvedValue({ id: 'sku-1' });
    repository.recordAdjustment.mockResolvedValue({
      movement: { id: 'movement-1', type: InventoryMovementType.ADJUSTMENT_IN },
      balance: { onHandQuantity: '5', availableQuantity: '5' },
    });

    const result = await service.recordAdjustment('tenant-1', 'user-1', {
      skuId: 'sku-1',
      warehouseId: 'warehouse-1',
      type: InventoryMovementType.ADJUSTMENT_IN,
      quantity: 5,
      reasonCode: 'INITIAL_COUNT',
      notes: 'Contagem inicial',
    });

    expect(repository.recordAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        type: InventoryMovementType.ADJUSTMENT_IN,
        quantityDelta: 5,
        reasonCode: 'INITIAL_COUNT',
      }),
    );
    expect(result.movement.id).toBe('movement-1');
  });

  it('rejects adjustments for missing warehouses', async () => {
    repository.findWarehouseById.mockResolvedValue(null);

    await expect(
      service.recordAdjustment('tenant-1', 'user-1', {
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        type: InventoryMovementType.ADJUSTMENT_IN,
        quantity: 1,
        reasonCode: 'COUNT',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
