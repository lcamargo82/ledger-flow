import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InternalOrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const ordersRepository = {
    findById: jest.fn(),
    findByIdempotencyKey: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    setItemReservation: jest.fn(),
    listPaginated: jest.fn(),
  };

  const inventoryService = {
    reserveStock: jest.fn(),
    releaseReservation: jest.fn(),
    consumeReservation: jest.fn(),
  };

  const prisma = {
    auditLog: {
      create: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  };

  let service: OrdersService;

  const draftOrder = {
    id: 'order-1',
    tenantId: 'tenant-1',
    status: InternalOrderStatus.DRAFT,
    orderNumber: 'ORD-000001',
    idempotencyKey: 'create-order-1',
    items: [
      {
        id: 'item-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        quantity: '2',
        reservationId: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrdersService(
      ordersRepository as never,
      inventoryService as never,
      prisma as never,
    );
  });

  it('creates a draft internal order with idempotency and audit log', async () => {
    ordersRepository.findByIdempotencyKey.mockResolvedValue(null);
    ordersRepository.create.mockResolvedValue(draftOrder);

    const result = await service.create('tenant-1', 'user-1', {
      idempotencyKey: 'create-order-1',
      customerName: 'Cliente teste',
      notes: 'Pedido interno',
      items: [
        {
          skuId: 'sku-1',
          warehouseId: 'warehouse-1',
          quantity: 2,
        },
      ],
    });

    expect(ordersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        idempotencyKey: 'create-order-1',
        customerName: 'Cliente teste',
        items: [
          {
            skuId: 'sku-1',
            warehouseId: 'warehouse-1',
            quantity: 2,
          },
        ],
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'orders.order.created',
        entityType: 'InternalOrder',
        entityId: 'order-1',
      }),
    });
    expect(result.order.status).toBe(InternalOrderStatus.DRAFT);
  });

  it('returns the existing order when create idempotency key is repeated', async () => {
    ordersRepository.findByIdempotencyKey.mockResolvedValue(draftOrder);

    const result = await service.create('tenant-1', 'user-1', {
      idempotencyKey: 'create-order-1',
      items: [{ skuId: 'sku-1', warehouseId: 'warehouse-1', quantity: 2 }],
    });

    expect(ordersRepository.create).not.toHaveBeenCalled();
    expect(result.order.id).toBe('order-1');
  });

  it('confirms a draft order and reserves stock for every item', async () => {
    ordersRepository.findById.mockResolvedValue(draftOrder);
    inventoryService.reserveStock.mockResolvedValue({
      reservation: { id: 'reservation-1', status: 'ACTIVE' },
    });
    ordersRepository.setItemReservation.mockResolvedValue(undefined);
    ordersRepository.updateStatus.mockResolvedValue({
      ...draftOrder,
      status: InternalOrderStatus.CONFIRMED,
      items: [{ ...draftOrder.items[0], reservationId: 'reservation-1' }],
    });

    const result = await service.confirm('order-1', 'tenant-1', 'user-1', {
      reasonCode: 'ORDER_CONFIRMED',
      idempotencyKey: 'confirm-order-1',
    });

    expect(inventoryService.reserveStock).toHaveBeenCalledWith('tenant-1', 'user-1', {
      skuId: 'sku-1',
      warehouseId: 'warehouse-1',
      quantity: 2,
      sourceType: 'INTERNAL_ORDER',
      sourceId: 'order-1:item-1',
      idempotencyKey: 'confirm-order-1:item-1',
      reasonCode: 'ORDER_CONFIRMED',
      notes: undefined,
    });
    expect(ordersRepository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      'tenant-1',
      InternalOrderStatus.CONFIRMED,
    );
    expect(result.order.status).toBe(InternalOrderStatus.CONFIRMED);
  });

  it('cancels a confirmed order and releases its reservations', async () => {
    ordersRepository.findById.mockResolvedValue({
      ...draftOrder,
      status: InternalOrderStatus.CONFIRMED,
      items: [{ ...draftOrder.items[0], reservationId: 'reservation-1' }],
    });
    inventoryService.releaseReservation.mockResolvedValue({
      reservation: { id: 'reservation-1', status: 'RELEASED' },
    });
    ordersRepository.updateStatus.mockResolvedValue({
      ...draftOrder,
      status: InternalOrderStatus.CANCELLED,
    });

    const result = await service.cancel('order-1', 'tenant-1', 'user-1', {
      reasonCode: 'CUSTOMER_CANCELLED',
      idempotencyKey: 'cancel-order-1',
      notes: 'Cliente desistiu',
    });

    expect(inventoryService.releaseReservation).toHaveBeenCalledWith(
      'reservation-1',
      'tenant-1',
      'user-1',
      {
        reasonCode: 'CUSTOMER_CANCELLED',
        idempotencyKey: 'cancel-order-1:item-1',
        notes: 'Cliente desistiu',
      },
    );
    expect(result.order.status).toBe(InternalOrderStatus.CANCELLED);
  });

  it('fulfills a confirmed order and consumes its reservations', async () => {
    ordersRepository.findById.mockResolvedValue({
      ...draftOrder,
      status: InternalOrderStatus.CONFIRMED,
      items: [{ ...draftOrder.items[0], reservationId: 'reservation-1' }],
    });
    inventoryService.consumeReservation.mockResolvedValue({
      reservation: { id: 'reservation-1', status: 'CONSUMED' },
    });
    ordersRepository.updateStatus.mockResolvedValue({
      ...draftOrder,
      status: InternalOrderStatus.FULFILLED,
    });

    const result = await service.fulfill('order-1', 'tenant-1', 'user-1', {
      reasonCode: 'ORDER_FULFILLED',
      idempotencyKey: 'fulfill-order-1',
    });

    expect(inventoryService.consumeReservation).toHaveBeenCalledWith(
      'reservation-1',
      'tenant-1',
      'user-1',
      {
        reasonCode: 'ORDER_FULFILLED',
        idempotencyKey: 'fulfill-order-1:item-1',
        notes: undefined,
      },
    );
    expect(result.order.status).toBe(InternalOrderStatus.FULFILLED);
  });

  it('rejects confirmation for cancelled orders', async () => {
    ordersRepository.findById.mockResolvedValue({
      ...draftOrder,
      status: InternalOrderStatus.CANCELLED,
    });

    await expect(
      service.confirm('order-1', 'tenant-1', 'user-1', {
        reasonCode: 'ORDER_CONFIRMED',
        idempotencyKey: 'confirm-order-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects transitions for missing orders', async () => {
    ordersRepository.findById.mockResolvedValue(null);

    await expect(
      service.cancel('order-1', 'tenant-1', 'user-1', {
        reasonCode: 'CANCELLED',
        idempotencyKey: 'cancel-order-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
