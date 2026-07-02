import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { InventoryMovementType, InventoryReservationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  AdjustmentData,
  InventoryRepository,
  ListInventoryParams,
  ListWarehousesParams,
  ReservationData,
  ReservationTransitionData,
} from '../../domain/repositories/inventory.repository';

@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWarehouseByCode(code: string, tenantId: string) {
    return this.prisma.warehouse.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
  }

  findWarehouseById(id: string, tenantId: string) {
    return this.prisma.warehouse.findFirst({ where: { id, tenantId } });
  }

  createWarehouse(data: { tenantId: string; code: string; name: string }) {
    return this.prisma.warehouse.create({ data });
  }

  updateWarehouse(id: string, tenantId: string, data: { name?: string; isActive?: boolean }) {
    return this.prisma.warehouse.update({
      where: { id },
      data,
    });
  }

  async listWarehouses(params: ListWarehousesParams) {
    const { tenantId, page = 1, perPage = 10, search, isActive } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.WarehouseWhereInput = { tenantId };

    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search) {
      where.OR = [
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  findSkuById(id: string, tenantId: string) {
    return this.prisma.productSku.findFirst({ where: { id, tenantId } });
  }

  async recordAdjustment(data: AdjustmentData) {
    return this.prisma.$transaction(async (tx) => {
      const signedDelta =
        data.type === InventoryMovementType.ADJUSTMENT_OUT
          ? -Math.abs(data.quantityDelta)
          : Math.abs(data.quantityDelta);

      const currentBalance = await tx.inventoryBalance.findUnique({
        where: {
          tenantId_skuId_warehouseId: {
            tenantId: data.tenantId,
            skuId: data.skuId,
            warehouseId: data.warehouseId,
          },
        },
      });

      const currentOnHand = currentBalance ? Number(currentBalance.onHandQuantity) : 0;
      const reserved = currentBalance ? Number(currentBalance.reservedQuantity) : 0;
      const nextOnHand = currentOnHand + signedDelta;

      if (nextOnHand < reserved) {
        throw new BadRequestException('Insufficient on-hand quantity for adjustment.');
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId: data.tenantId,
          skuId: data.skuId,
          warehouseId: data.warehouseId,
          type: data.type,
          quantityDelta: signedDelta,
          unitCost: data.unitCost ?? undefined,
          sourceType: data.sourceType,
          sourceId: data.sourceId,
          idempotencyKey: data.idempotencyKey,
          reasonCode: data.reasonCode,
          notes: data.notes,
          occurredAt: data.occurredAt,
          createdByUserId: data.createdByUserId,
        },
      });

      const balance = await tx.inventoryBalance.upsert({
        where: {
          tenantId_skuId_warehouseId: {
            tenantId: data.tenantId,
            skuId: data.skuId,
            warehouseId: data.warehouseId,
          },
        },
        create: {
          tenantId: data.tenantId,
          skuId: data.skuId,
          warehouseId: data.warehouseId,
          onHandQuantity: nextOnHand,
          reservedQuantity: 0,
          availableQuantity: nextOnHand,
          version: 1,
        },
        update: {
          onHandQuantity: nextOnHand,
          availableQuantity: nextOnHand - reserved,
          version: { increment: 1 },
        },
      });

      return { movement, balance };
    });
  }

  async reserveStock(data: ReservationData) {
    return this.prisma.$transaction(async (tx) => {
      const existingReservation = await tx.inventoryReservation.findFirst({
        where: {
          tenantId: data.tenantId,
          OR: [
            { idempotencyKey: data.idempotencyKey },
            { sourceType: data.sourceType, sourceId: data.sourceId },
          ],
        },
      });

      if (existingReservation) {
        if (
          existingReservation.idempotencyKey === data.idempotencyKey &&
          (existingReservation.sourceType !== data.sourceType ||
            existingReservation.sourceId !== data.sourceId)
        ) {
          throw new ConflictException('Idempotency key already used for another reservation.');
        }

        const [movement, balance] = await Promise.all([
          tx.inventoryMovement.findFirst({
            where: {
              tenantId: data.tenantId,
              sourceType: data.sourceType,
              sourceId: data.sourceId,
              type: InventoryMovementType.RESERVATION,
            },
          }),
          tx.inventoryBalance.findUnique({
            where: {
              tenantId_skuId_warehouseId: {
                tenantId: existingReservation.tenantId,
                skuId: existingReservation.skuId,
                warehouseId: existingReservation.warehouseId,
              },
            },
          }),
        ]);

        if (!movement || !balance) {
          throw new ConflictException('Reservation idempotency state is incomplete.');
        }

        return { reservation: existingReservation, movement, balance };
      }

      await this.lockBalance(tx, data.tenantId, data.skuId, data.warehouseId);
      const currentBalance = await this.findLockedBalance(
        tx,
        data.tenantId,
        data.skuId,
        data.warehouseId,
      );

      const quantity = Math.abs(data.quantity);
      const available = Number(currentBalance.availableQuantity);
      if (available < quantity) {
        throw new BadRequestException('Insufficient available quantity for reservation.');
      }

      const nextReserved = Number(currentBalance.reservedQuantity) + quantity;
      const nextAvailable = available - quantity;

      const reservation = await tx.inventoryReservation.create({
        data: {
          tenantId: data.tenantId,
          skuId: data.skuId,
          warehouseId: data.warehouseId,
          quantity,
          sourceType: data.sourceType,
          sourceId: data.sourceId,
          idempotencyKey: data.idempotencyKey,
          reasonCode: data.reasonCode,
          notes: data.notes,
          createdByUserId: data.createdByUserId,
        },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId: data.tenantId,
          skuId: data.skuId,
          warehouseId: data.warehouseId,
          type: InventoryMovementType.RESERVATION,
          quantityDelta: quantity,
          sourceType: data.sourceType,
          sourceId: data.sourceId,
          idempotencyKey: data.idempotencyKey,
          reasonCode: data.reasonCode,
          notes: data.notes,
          occurredAt: new Date(),
          createdByUserId: data.createdByUserId,
        },
      });

      const balance = await tx.inventoryBalance.update({
        where: {
          tenantId_skuId_warehouseId: {
            tenantId: data.tenantId,
            skuId: data.skuId,
            warehouseId: data.warehouseId,
          },
        },
        data: {
          reservedQuantity: nextReserved,
          availableQuantity: nextAvailable,
          version: { increment: 1 },
        },
      });

      return { reservation, movement, balance };
    });
  }

  async releaseReservation(data: ReservationTransitionData) {
    return this.transitionReservation(data, {
      status: InventoryReservationStatus.RELEASED,
      movementType: InventoryMovementType.RESERVATION_RELEASE,
      eventType: 'inventory.reservation.released',
    });
  }

  async consumeReservation(data: ReservationTransitionData) {
    return this.transitionReservation(data, {
      status: InventoryReservationStatus.CONSUMED,
      movementType: InventoryMovementType.FULFILLMENT,
      eventType: 'inventory.reservation.consumed',
      createOutbox: true,
    });
  }

  async listReservations(params: ListInventoryParams) {
    const { tenantId, page = 1, perPage = 10, skuId, warehouseId, status } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.InventoryReservationWhereInput = { tenantId, skuId, warehouseId, status };

    const [data, total] = await Promise.all([
      this.prisma.inventoryReservation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryReservation.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  async listBalances(params: ListInventoryParams) {
    const { tenantId, page = 1, perPage = 10, skuId, warehouseId } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.InventoryBalanceWhereInput = { tenantId, skuId, warehouseId };

    const [data, total] = await Promise.all([
      this.prisma.inventoryBalance.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventoryBalance.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  private async transitionReservation(
    data: ReservationTransitionData,
    operation: {
      status: 'RELEASED' | 'CONSUMED';
      movementType: 'RESERVATION_RELEASE' | 'FULFILLMENT';
      eventType: string;
      createOutbox?: boolean;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findFirst({
        where: { id: data.reservationId, tenantId: data.tenantId },
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found.');
      }

      const existingMovement = await tx.inventoryMovement.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: data.tenantId,
            idempotencyKey: data.idempotencyKey,
          },
        },
      });

      if (
        existingMovement &&
        existingMovement.sourceType === 'INVENTORY_RESERVATION' &&
        existingMovement.sourceId === reservation.id &&
        existingMovement.type === operation.movementType &&
        reservation.status === operation.status
      ) {
        const balance = await this.findLockedBalance(
          tx,
          reservation.tenantId,
          reservation.skuId,
          reservation.warehouseId,
        );
        const outboxEvent = operation.createOutbox
          ? await tx.outboxEvent.findFirst({
              where: {
                tenantId: data.tenantId,
                aggregateType: 'InventoryReservation',
                aggregateId: reservation.id,
                eventType: operation.eventType,
              },
              orderBy: { createdAt: 'desc' },
            })
          : undefined;

        return {
          reservation,
          movement: existingMovement,
          balance,
          ...(outboxEvent && { outboxEvent }),
        };
      }

      if (existingMovement) {
        throw new ConflictException(
          'Idempotency key already used for another inventory operation.',
        );
      }

      if (reservation.status !== InventoryReservationStatus.ACTIVE) {
        throw new BadRequestException('Only active reservations can be transitioned.');
      }

      await this.lockBalance(tx, reservation.tenantId, reservation.skuId, reservation.warehouseId);
      const currentBalance = await this.findLockedBalance(
        tx,
        reservation.tenantId,
        reservation.skuId,
        reservation.warehouseId,
      );

      const quantity = Number(reservation.quantity);
      const currentReserved = Number(currentBalance.reservedQuantity);
      if (currentReserved < quantity) {
        throw new BadRequestException('Reserved quantity is lower than reservation quantity.');
      }

      const isConsume = operation.status === InventoryReservationStatus.CONSUMED;
      const nextOnHand = Number(currentBalance.onHandQuantity) - (isConsume ? quantity : 0);
      const nextReserved = currentReserved - quantity;
      const nextAvailable = isConsume
        ? Number(currentBalance.availableQuantity)
        : Number(currentBalance.availableQuantity) + quantity;

      const updatedReservation = await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: operation.status,
          ...(operation.status === InventoryReservationStatus.RELEASED && {
            releasedAt: new Date(),
          }),
          ...(operation.status === InventoryReservationStatus.CONSUMED && {
            consumedAt: new Date(),
          }),
        },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId: reservation.tenantId,
          skuId: reservation.skuId,
          warehouseId: reservation.warehouseId,
          type: operation.movementType,
          quantityDelta: -quantity,
          sourceType: 'INVENTORY_RESERVATION',
          sourceId: reservation.id,
          idempotencyKey: data.idempotencyKey,
          reasonCode: data.reasonCode,
          notes: data.notes,
          occurredAt: new Date(),
          createdByUserId: data.actorUserId,
        },
      });

      const balance = await tx.inventoryBalance.update({
        where: {
          tenantId_skuId_warehouseId: {
            tenantId: reservation.tenantId,
            skuId: reservation.skuId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          onHandQuantity: nextOnHand,
          reservedQuantity: nextReserved,
          availableQuantity: nextAvailable,
          version: { increment: 1 },
        },
      });

      const outboxEvent = operation.createOutbox
        ? await tx.outboxEvent.create({
            data: this.createOutboxPayload({
              tenantId: reservation.tenantId,
              aggregateId: reservation.id,
              eventType: operation.eventType,
              payload: {
                reservationId: reservation.id,
                skuId: reservation.skuId,
                warehouseId: reservation.warehouseId,
                quantity,
                movementId: movement.id,
              },
            }),
          })
        : undefined;

      return {
        reservation: updatedReservation,
        movement,
        balance,
        ...(outboxEvent && { outboxEvent }),
      };
    });
  }

  private async lockBalance(
    tx: Prisma.TransactionClient,
    tenantId: string,
    skuId: string,
    warehouseId: string,
  ) {
    await tx.$queryRaw`
      SELECT "id"
      FROM "inventory_balances"
      WHERE "tenant_id" = ${tenantId}
        AND "sku_id" = ${skuId}
        AND "warehouse_id" = ${warehouseId}
      FOR UPDATE
    `;
  }

  private async findLockedBalance(
    tx: Prisma.TransactionClient,
    tenantId: string,
    skuId: string,
    warehouseId: string,
  ) {
    const balance = await tx.inventoryBalance.findUnique({
      where: {
        tenantId_skuId_warehouseId: {
          tenantId,
          skuId,
          warehouseId,
        },
      },
    });

    if (!balance) {
      throw new NotFoundException('Inventory balance not found.');
    }

    return balance;
  }

  private createOutboxPayload(input: {
    tenantId: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Prisma.OutboxEventUncheckedCreateInput {
    const payloadHash = createHash('sha256').update(JSON.stringify(input.payload)).digest('hex');

    return {
      tenantId: input.tenantId,
      aggregateType: 'InventoryReservation',
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      eventVersion: 1,
      payload: input.payload as Prisma.InputJsonValue,
      payloadHash,
    };
  }

  async listMovements(params: ListInventoryParams) {
    const { tenantId, page = 1, perPage = 10, skuId, warehouseId, type } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.InventoryMovementWhereInput = {
      tenantId,
      skuId,
      warehouseId,
      type,
    };

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }
}
