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
    findSkuByCode: jest.fn(),
    recordAdjustment: jest.fn(),
    reserveStock: jest.fn(),
    releaseReservation: jest.fn(),
    consumeReservation: jest.fn(),
    listBalances: jest.fn(),
    listMovements: jest.fn(),
    listReservations: jest.fn(),
    createTransfer: jest.fn(),
    listTransfers: jest.fn(),
    findTransferById: jest.fn(),
    updateTransferDraft: jest.fn(),
    startTransfer: jest.fn(),
    completeTransfer: jest.fn(),
    cancelTransfer: jest.fn(),
    createCycleCount: jest.fn(),
    listCycleCounts: jest.fn(),
    findCycleCountById: jest.fn(),
    openCycleCount: jest.fn(),
    countCycleCountItem: jest.fn(),
    approveCycleCount: jest.fn(),
    cancelCycleCount: jest.fn(),
  };

  const prisma = {
    auditLog: {
      create: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  };

  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(repository, prisma as never);
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
    repository.findSkuByCode.mockResolvedValue(null);
    repository.recordAdjustment.mockResolvedValue({
      movement: { id: 'movement-1', type: InventoryMovementType.ADJUSTMENT_IN },
      balance: {
        id: 'balance-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        onHandQuantity: '5',
        reservedQuantity: '0',
        availableQuantity: '5',
        version: 1,
      },
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
    repository.findSkuById.mockResolvedValue(null);
    repository.findSkuByCode.mockResolvedValue(null);

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

  it('records adjustment using the visible catalog SKU code', async () => {
    repository.findWarehouseById.mockResolvedValue({
      id: 'warehouse-1',
      isActive: true,
    });
    repository.findSkuById.mockResolvedValue(null);
    repository.findSkuByCode.mockResolvedValue({ id: 'sku-1', averageCost: 40 });
    repository.recordAdjustment.mockResolvedValue({
      movement: { id: 'movement-1', type: InventoryMovementType.ADJUSTMENT_IN },
      balance: {
        id: 'balance-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        onHandQuantity: '6',
        reservedQuantity: '0',
        availableQuantity: '6',
        version: 1,
      },
    });

    await service.recordAdjustment('tenant-1', 'user-1', {
      skuId: 'CONTROL-AZUL-CAMUF',
      warehouseId: 'warehouse-1',
      type: InventoryMovementType.ADJUSTMENT_IN,
      quantity: 6,
      reasonCode: 'INITIAL_COUNT',
    });

    expect(repository.findSkuByCode).toHaveBeenCalledWith('CONTROL-AZUL-CAMUF', 'tenant-1');
    expect(repository.recordAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        skuId: 'sku-1',
        unitCost: 40,
      }),
    );
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
        id: 'balance-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        onHandQuantity: '10',
        reservedQuantity: '3',
        availableQuantity: '7',
        version: 2,
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
        id: 'balance-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        onHandQuantity: '10',
        reservedQuantity: '0',
        availableQuantity: '10',
        version: 3,
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
        id: 'balance-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        onHandQuantity: '7',
        reservedQuantity: '0',
        availableQuantity: '7',
        version: 4,
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

  it('creates a draft transfer after validating warehouses and SKUs', async () => {
    repository.findWarehouseById
      .mockResolvedValueOnce({ id: 'warehouse-source', isActive: true })
      .mockResolvedValueOnce({ id: 'warehouse-destination', isActive: true });
    repository.findSkuById.mockResolvedValue({ id: 'sku-1' });
    repository.createTransfer.mockResolvedValue({
      id: 'transfer-1',
      status: 'DRAFT',
      items: [{ skuId: 'sku-1', quantity: '2' }],
    });

    const result = await service.createTransfer('tenant-1', 'user-1', {
      sourceWarehouseId: 'warehouse-source',
      destinationWarehouseId: 'warehouse-destination',
      idempotencyKey: 'transfer-key-1',
      reasonCode: 'REPLENISHMENT',
      notes: 'Reposicao',
      items: [{ skuId: 'sku-1', quantity: 2 }],
    });

    expect(repository.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        createdByUserId: 'user-1',
        sourceWarehouseId: 'warehouse-source',
        destinationWarehouseId: 'warehouse-destination',
        idempotencyKey: 'transfer-key-1',
        reasonCode: 'REPLENISHMENT',
        items: [{ skuId: 'sku-1', quantity: 2 }],
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.transfer.created',
        entityType: 'InventoryTransfer',
        entityId: 'transfer-1',
      }),
    });
    expect(result.status).toBe('DRAFT');
  });

  it('rejects a transfer using the same source and destination warehouse', async () => {
    await expect(
      service.createTransfer('tenant-1', 'user-1', {
        sourceWarehouseId: 'warehouse-1',
        destinationWarehouseId: 'warehouse-1',
        idempotencyKey: 'transfer-key-1',
        reasonCode: 'REPLENISHMENT',
        items: [{ skuId: 'sku-1', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('starts a draft transfer and audits the transition', async () => {
    repository.startTransfer.mockResolvedValue({
      id: 'transfer-1',
      status: 'IN_TRANSIT',
    });

    const result = await service.startTransfer('transfer-1', 'tenant-1', 'user-1');

    expect(repository.startTransfer).toHaveBeenCalledWith({
      transferId: 'transfer-1',
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.transfer.started',
        entityId: 'transfer-1',
      }),
    });
    expect(result.status).toBe('IN_TRANSIT');
  });

  it('completes a transfer with paired movements, audit log and balance outbox events', async () => {
    repository.completeTransfer.mockResolvedValue({
      transfer: {
        id: 'transfer-1',
        status: 'COMPLETED',
        items: [{ id: 'item-1', skuId: 'sku-1', quantity: '2' }],
      },
      movements: [
        { id: 'movement-out', type: InventoryMovementType.TRANSFER_OUT },
        { id: 'movement-in', type: InventoryMovementType.TRANSFER_IN },
      ],
      balances: [
        {
          id: 'balance-source',
          skuId: 'sku-1',
          warehouseId: 'warehouse-source',
          onHandQuantity: '8',
          reservedQuantity: '0',
          availableQuantity: '8',
          version: 2,
        },
        {
          id: 'balance-destination',
          skuId: 'sku-1',
          warehouseId: 'warehouse-destination',
          onHandQuantity: '2',
          reservedQuantity: '0',
          availableQuantity: '2',
          version: 1,
        },
      ],
      outboxEvent: { id: 'outbox-1', eventType: 'inventory.transfer.completed' },
    });

    const result = await service.completeTransfer('transfer-1', 'tenant-1', 'user-1', {
      idempotencyKey: 'complete-transfer-1',
    });

    expect(repository.completeTransfer).toHaveBeenCalledWith({
      transferId: 'transfer-1',
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
      idempotencyKey: 'complete-transfer-1',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.transfer.completed',
        entityId: 'transfer-1',
      }),
    });
    expect(prisma.outboxEvent.create).toHaveBeenCalledTimes(2);
    expect(result.movements.map((movement) => movement.type)).toEqual([
      InventoryMovementType.TRANSFER_OUT,
      InventoryMovementType.TRANSFER_IN,
    ]);
  });

  it('cancels a non-completed transfer and audits the transition', async () => {
    repository.cancelTransfer.mockResolvedValue({
      id: 'transfer-1',
      status: 'CANCELED',
    });

    const result = await service.cancelTransfer('transfer-1', 'tenant-1', 'user-1', {
      reasonCode: 'OTHER',
      notes: 'Cancelado pela operacao',
    });

    expect(repository.cancelTransfer).toHaveBeenCalledWith({
      transferId: 'transfer-1',
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
      reasonCode: 'OTHER',
      notes: 'Cancelado pela operacao',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.transfer.canceled',
        entityId: 'transfer-1',
      }),
    });
    expect(result.status).toBe('CANCELED');
  });

  it('creates a draft cycle count after validating warehouse and SKUs', async () => {
    repository.findWarehouseById.mockResolvedValue({ id: 'warehouse-1', isActive: true });
    repository.findSkuById.mockResolvedValue({ id: 'sku-1' });
    repository.createCycleCount.mockResolvedValue({
      id: 'count-1',
      status: 'DRAFT',
      items: [{ skuId: 'sku-1' }],
    });

    const result = await service.createCycleCount('tenant-1', 'user-1', {
      warehouseId: 'warehouse-1',
      idempotencyKey: 'count-key-1',
      reasonCode: 'SCHEDULED_COUNT',
      notes: 'Contagem mensal',
      items: [{ skuId: 'sku-1' }],
    });

    expect(repository.createCycleCount).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        createdByUserId: 'user-1',
        warehouseId: 'warehouse-1',
        idempotencyKey: 'count-key-1',
        reasonCode: 'SCHEDULED_COUNT',
        items: [{ skuId: 'sku-1' }],
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.cycle_count.created',
        entityType: 'CycleCount',
        entityId: 'count-1',
      }),
    });
    expect(result.status).toBe('DRAFT');
  });

  it('opens a cycle count with balance snapshots and audits the transition', async () => {
    repository.openCycleCount.mockResolvedValue({
      id: 'count-1',
      status: 'OPEN',
      items: [{ id: 'item-1', systemOnHandAtOpen: '10', balanceVersionAtOpen: 3 }],
    });

    const result = await service.openCycleCount('count-1', 'tenant-1', 'user-1');

    expect(repository.openCycleCount).toHaveBeenCalledWith({
      cycleCountId: 'count-1',
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.cycle_count.opened',
        entityId: 'count-1',
      }),
    });
    expect(result.status).toBe('OPEN');
  });

  it('records a counted quantity for an open cycle count item', async () => {
    repository.countCycleCountItem.mockResolvedValue({
      id: 'count-1',
      status: 'COUNTED',
      items: [{ id: 'item-1', countedQuantity: '8', varianceQuantity: '-2' }],
    });

    const result = await service.countCycleCountItem('count-1', 'item-1', 'tenant-1', 'user-1', {
      countedQuantity: 8,
    });

    expect(repository.countCycleCountItem).toHaveBeenCalledWith({
      cycleCountId: 'count-1',
      itemId: 'item-1',
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
      countedQuantity: 8,
    });
    expect(result.status).toBe('COUNTED');
  });

  it('approves a counted cycle count with adjustments, audit log and balance outbox events', async () => {
    repository.approveCycleCount.mockResolvedValue({
      cycleCount: {
        id: 'count-1',
        status: 'APPROVED',
        items: [{ id: 'item-1', skuId: 'sku-1', adjustmentMovementId: 'movement-1' }],
      },
      movements: [{ id: 'movement-1', type: InventoryMovementType.ADJUSTMENT_OUT }],
      balances: [
        {
          id: 'balance-1',
          skuId: 'sku-1',
          warehouseId: 'warehouse-1',
          onHandQuantity: '8',
          reservedQuantity: '0',
          availableQuantity: '8',
          version: 4,
        },
      ],
      outboxEvent: { id: 'outbox-1', eventType: 'inventory.cycle_count.adjusted' },
    });

    const result = await service.approveCycleCount('count-1', 'tenant-1', 'user-1', {
      reasonCode: 'DISCREPANCY_RECOUNT',
      idempotencyKey: 'approve-count-1',
      notes: 'Aprovado pela auditoria',
    });

    expect(repository.approveCycleCount).toHaveBeenCalledWith({
      cycleCountId: 'count-1',
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
      reasonCode: 'DISCREPANCY_RECOUNT',
      idempotencyKey: 'approve-count-1',
      notes: 'Aprovado pela auditoria',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.cycle_count.approved',
        entityId: 'count-1',
      }),
    });
    expect(prisma.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(result.movements[0].type).toBe(InventoryMovementType.ADJUSTMENT_OUT);
  });

  it('cancels a non-approved cycle count and audits the transition', async () => {
    repository.cancelCycleCount.mockResolvedValue({
      id: 'count-1',
      status: 'CANCELED',
      reasonCode: 'OTHER',
    });

    const result = await service.cancelCycleCount('count-1', 'tenant-1', 'user-1', {
      reasonCode: 'OTHER',
      notes: 'Cancelado pela operacao',
    });

    expect(repository.cancelCycleCount).toHaveBeenCalledWith({
      cycleCountId: 'count-1',
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
      reasonCode: 'OTHER',
      notes: 'Cancelado pela operacao',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'inventory.cycle_count.canceled',
        entityId: 'count-1',
      }),
    });
    expect(result.status).toBe('CANCELED');
  });
});
