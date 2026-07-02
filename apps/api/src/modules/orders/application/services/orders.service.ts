import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InternalOrderItem, InternalOrderStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { InventoryService } from '../../../inventory/application/services/inventory.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto';
import { OrderTransitionDto } from '../dto/order-transition.dto';
import {
  InternalOrderWithItems,
  ORDERS_REPOSITORY,
} from '../../domain/repositories/orders.repository';
import type { OrdersRepository } from '../../domain/repositories/orders.repository';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService,
  ) {}

  async create(tenantId: string, actorUserId: string, dto: CreateOrderDto) {
    this.assertReason(dto.idempotencyKey, 'Idempotency key is required.');

    const existingOrder = await this.ordersRepository.findByIdempotencyKey(
      tenantId,
      dto.idempotencyKey,
    );
    if (existingOrder) {
      return { order: existingOrder };
    }

    const order = await this.ordersRepository.create({
      tenantId,
      idempotencyKey: dto.idempotencyKey,
      customerName: dto.customerName ?? null,
      notes: dto.notes ?? null,
      createdByUserId: actorUserId,
      items: dto.items.map((item) => ({
        skuId: item.skuId,
        warehouseId: item.warehouseId,
        quantity: item.quantity,
      })),
    });

    await this.auditOrder(tenantId, actorUserId, 'orders.order.created', order.id);

    return { order };
  }

  list(tenantId: string, query: ListOrdersQueryDto) {
    return this.ordersRepository.listPaginated({ tenantId, ...query });
  }

  async findOne(id: string, tenantId: string) {
    return this.getOrderOrThrow(id, tenantId);
  }

  async confirm(id: string, tenantId: string, actorUserId: string, dto: OrderTransitionDto) {
    this.assertReason(dto.reasonCode, 'Reason code is required.');
    this.assertReason(dto.idempotencyKey, 'Idempotency key is required.');

    const order = await this.getOrderOrThrow(id, tenantId);
    if (order.status === InternalOrderStatus.CONFIRMED) {
      return { order };
    }
    if (order.status !== InternalOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft orders can be confirmed.');
    }

    for (const item of order.items) {
      if (item.reservationId) continue;

      const reservation = await this.inventoryService.reserveStock(tenantId, actorUserId, {
        skuId: item.skuId,
        warehouseId: item.warehouseId,
        quantity: Number(item.quantity),
        sourceType: 'INTERNAL_ORDER',
        sourceId: this.itemSourceId(order.id, item.id),
        idempotencyKey: this.itemIdempotencyKey(dto.idempotencyKey, item.id),
        reasonCode: dto.reasonCode,
        notes: dto.notes,
      });

      await this.ordersRepository.setItemReservation(item.id, tenantId, reservation.reservation.id);
    }

    const updatedOrder = await this.ordersRepository.updateStatus(
      order.id,
      tenantId,
      InternalOrderStatus.CONFIRMED,
    );

    await this.auditOrder(tenantId, actorUserId, 'orders.order.confirmed', order.id, {
      reasonCode: dto.reasonCode,
    });
    await this.createOrderOutbox(tenantId, updatedOrder.id, 'orders.order.confirmed', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    });

    return { order: updatedOrder };
  }

  async cancel(id: string, tenantId: string, actorUserId: string, dto: OrderTransitionDto) {
    this.assertReason(dto.reasonCode, 'Reason code is required.');
    this.assertReason(dto.idempotencyKey, 'Idempotency key is required.');

    const order = await this.getOrderOrThrow(id, tenantId);
    if (order.status === InternalOrderStatus.CANCELLED) {
      return { order };
    }
    if (order.status === InternalOrderStatus.FULFILLED) {
      throw new BadRequestException('Fulfilled orders cannot be cancelled.');
    }

    for (const item of order.items) {
      if (!item.reservationId) continue;
      await this.inventoryService.releaseReservation(item.reservationId, tenantId, actorUserId, {
        reasonCode: dto.reasonCode,
        idempotencyKey: this.itemIdempotencyKey(dto.idempotencyKey, item.id),
        notes: dto.notes,
      });
    }

    const updatedOrder = await this.ordersRepository.updateStatus(
      order.id,
      tenantId,
      InternalOrderStatus.CANCELLED,
    );

    await this.auditOrder(tenantId, actorUserId, 'orders.order.cancelled', order.id, {
      reasonCode: dto.reasonCode,
    });
    await this.createOrderOutbox(tenantId, updatedOrder.id, 'orders.order.cancelled', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    });

    return { order: updatedOrder };
  }

  async fulfill(id: string, tenantId: string, actorUserId: string, dto: OrderTransitionDto) {
    this.assertReason(dto.reasonCode, 'Reason code is required.');
    this.assertReason(dto.idempotencyKey, 'Idempotency key is required.');

    const order = await this.getOrderOrThrow(id, tenantId);
    if (order.status === InternalOrderStatus.FULFILLED) {
      return { order };
    }
    if (order.status !== InternalOrderStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed orders can be fulfilled.');
    }

    for (const item of order.items) {
      this.assertReservation(item);
      await this.inventoryService.consumeReservation(item.reservationId, tenantId, actorUserId, {
        reasonCode: dto.reasonCode,
        idempotencyKey: this.itemIdempotencyKey(dto.idempotencyKey, item.id),
        notes: dto.notes,
      });
    }

    const updatedOrder = await this.ordersRepository.updateStatus(
      order.id,
      tenantId,
      InternalOrderStatus.FULFILLED,
    );

    await this.auditOrder(tenantId, actorUserId, 'orders.order.fulfilled', order.id, {
      reasonCode: dto.reasonCode,
    });
    await this.createOrderOutbox(tenantId, updatedOrder.id, 'orders.order.fulfilled', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    });

    return { order: updatedOrder };
  }

  private async getOrderOrThrow(id: string, tenantId: string): Promise<InternalOrderWithItems> {
    const order = await this.ordersRepository.findById(id, tenantId);
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    return order;
  }

  private assertReservation(item: InternalOrderItem): asserts item is InternalOrderItem & {
    reservationId: string;
  } {
    if (!item.reservationId) {
      throw new BadRequestException('Order item does not have an active reservation.');
    }
  }

  private itemSourceId(orderId: string, itemId: string) {
    return `${orderId}:${itemId}`;
  }

  private itemIdempotencyKey(operationKey: string, itemId: string) {
    return `${operationKey}:${itemId}`;
  }

  private assertReason(value: string | undefined, message: string) {
    if (!value?.trim()) {
      throw new BadRequestException(message);
    }
  }

  private async auditOrder(
    tenantId: string,
    actorUserId: string,
    action: string,
    orderId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'InternalOrder',
        entityId: orderId,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  private async createOrderOutbox(
    tenantId: string,
    orderId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'InternalOrder',
        aggregateId: orderId,
        eventType,
        eventVersion: 1,
        payload: payload as Prisma.InputJsonValue,
        payloadHash,
      },
    });
  }
}
