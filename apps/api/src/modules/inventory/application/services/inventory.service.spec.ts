import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
    reserveStock: jest.fn(),
    releaseReservation: jest.fn(),
    consumeReservation: jest.fn(),
    listBalances: jest.fn(),
    listMovements: jest.fn(),
    listReservations: jest.fn(),
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

  it('reserves available stock with source idempotency and audit log', async () => {
    repository.findWarehouseById.mockResolvedValue({
      id: 'warehouse-1',
      isActive: true,
    });
    repository.findSkuById.mockResolvedValue({ id: 'sku-1' });
    repository.reserveStock.mockResolvedValue({
      reservation: {
        id: 'reservation-1',
        sourceType: 'ADMIN_HOLD',
        sourceId: 'hold-1',
        status: 'ACTIVE',
      },
      balance: {
        onHandQuantity: '10',
        reservedQuantity: '3',
        availableQuantity: '7',
      },
      movement: { id: 'movement-1', type: InventoryMovementType.RESERVATION },
    });

    const result = await service.reserveStock('tenant-1', 'user-1', {
      skuId: 'sku-1',
      warehouseId: 'warehouse-1',
      quantity: 3,
      sourceType: 'ADMIN_HOLD',
      sourceId: 'hold-1',
      idempotencyKey: 'reserve-hold-1',
      reasonCode: 'ALLOCATE',
      notes: 'Reserva operacional',
    });

    expect(repository.reserveStock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        quantity: 3,
        sourceType: 'ADMIN_HOLD',
        sourceId: 'hold-1',
        idempotencyKey: 'reserve-hold-1',
        reasonCode: 'ALLOCATE',
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'inventory.reservation.created',
        entityType: 'InventoryReservation',
        entityId: 'reservation-1',
      }),
    });
    expect(result.balance.availableQuantity).toBe('7');
  });

  it('releases an active reservation and audits the release', async () => {
    repository.releaseReservation.mockResolvedValue({
      reservation: {
        id: 'reservation-1',
        status: 'RELEASED',
      },
      balance: {
        onHandQuantity: '10',
        reservedQuantity: '0',
        availableQuantity: '10',
      },
      movement: { id: 'movement-2', type: InventoryMovementType.RESERVATION_RELEASE },
    });

    const result = await service.releaseReservation('reservation-1', 'tenant-1', 'user-1', {
      reasonCode: 'CANCELLED',
      notes: 'Liberação administrativa',
      idempotencyKey: 'release-reservation-1',
    });

    expect(repository.releaseReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 'reservation-1',
        tenantId: 'tenant-1',
        reasonCode: 'CANCELLED',
        idempotencyKey: 'release-reservation-1',
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.reservation.released',
        entityId: 'reservation-1',
      }),
    });
    expect(result.reservation.status).toBe('RELEASED');
  });

  it('consumes a full active reservation as fulfillment and audits the consumption', async () => {
    repository.consumeReservation.mockResolvedValue({
      reservation: {
        id: 'reservation-1',
        status: 'CONSUMED',
      },
      balance: {
        onHandQuantity: '7',
        reservedQuantity: '0',
        availableQuantity: '7',
      },
      movement: { id: 'movement-3', type: InventoryMovementType.FULFILLMENT },
      outboxEvent: { id: 'outbox-1', eventType: 'inventory.reservation.consumed' },
    });

    const result = await service.consumeReservation('reservation-1', 'tenant-1', 'user-1', {
      reasonCode: 'FULFILLMENT',
      notes: 'Consumo operacional',
      idempotencyKey: 'consume-reservation-1',
    });

    expect(repository.consumeReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 'reservation-1',
        tenantId: 'tenant-1',
        reasonCode: 'FULFILLMENT',
        idempotencyKey: 'consume-reservation-1',
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.reservation.consumed',
        entityId: 'reservation-1',
      }),
    });
    expect(result.movement.type).toBe(InventoryMovementType.FULFILLMENT);
    expect(result.balance.availableQuantity).toBe('7');
  });

  it('rejects consuming reservations without a reason', async () => {
    await expect(
      service.consumeReservation('reservation-1', 'tenant-1', 'user-1', {
        reasonCode: '',
        idempotencyKey: 'consume-reservation-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
