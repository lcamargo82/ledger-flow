import { Injectable } from '@nestjs/common';
import { InternalOrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CreateOrderData,
  ListOrdersParams,
  OrdersRepository,
} from '../../domain/repositories/orders.repository';

@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tenantId: string) {
    return this.prisma.internalOrder.findFirst({
      where: { id, tenantId },
      include: this.orderInclude(),
    });
  }

  findByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return this.prisma.internalOrder.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      include: this.orderInclude(),
    });
  }

  create(data: CreateOrderData) {
    return this.prisma.internalOrder.create({
      data: {
        tenantId: data.tenantId,
        orderNumber: this.createOrderNumber(),
        idempotencyKey: data.idempotencyKey,
        customerName: data.customerName,
        notes: data.notes,
        createdByUserId: data.createdByUserId,
        items: {
          create: data.items.map((item) => ({
            tenantId: data.tenantId,
            skuId: item.skuId,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
          })),
        },
      },
      include: this.orderInclude(),
    });
  }

  updateStatus(id: string, tenantId: string, status: InternalOrderStatus) {
    const timestampFieldByStatus: Partial<
      Record<InternalOrderStatus, Prisma.InternalOrderUpdateInput>
    > = {
      [InternalOrderStatus.CONFIRMED]: { confirmedAt: new Date() },
      [InternalOrderStatus.CANCELLED]: { cancelledAt: new Date() },
      [InternalOrderStatus.FULFILLED]: { fulfilledAt: new Date() },
    };

    return this.prisma.internalOrder.update({
      where: { id },
      data: {
        status,
        ...timestampFieldByStatus[status],
      },
      include: this.orderInclude(),
    });
  }

  async setItemReservation(itemId: string, tenantId: string, reservationId: string) {
    await this.prisma.internalOrderItem.updateMany({
      where: { id: itemId, tenantId },
      data: { reservationId },
    });
  }

  async listPaginated(params: ListOrdersParams) {
    const { tenantId, page = 1, perPage = 10, status } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.InternalOrderWhereInput = { tenantId, status };

    const [data, total] = await Promise.all([
      this.prisma.internalOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.orderInclude(),
      }),
      this.prisma.internalOrder.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  private createOrderNumber() {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private orderInclude() {
    return {
      items: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          sku: {
            select: {
              skuDisplay: true,
              product: { select: { name: true } },
            },
          },
          warehouse: {
            select: {
              name: true,
              code: true,
            },
          },
          reservation: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      shippingSummaries: { orderBy: { lastSyncedAt: 'desc' as const } },
    };
  }
}
