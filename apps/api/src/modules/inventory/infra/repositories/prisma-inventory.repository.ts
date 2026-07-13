import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import {
  InventoryBalance,
  InventoryMovement,
  InventoryMovementType,
  InventoryReservationStatus,
  InventoryTransferStatus,
  CycleCountStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  AdjustmentData,
  ApproveCycleCountData,
  CancelCycleCountData,
  CancelInventoryTransferData,
  CompleteInventoryTransferData,
  CountCycleCountItemData,
  CreateCycleCountData,
  CreateInventoryTransferData,
  InventoryRepository,
  ListCycleCountsParams,
  ListInventoryParams,
  ListInventoryTransfersParams,
  ListWarehousesParams,
  ReservationData,
  ReservationTransitionData,
  UpdateInventoryTransferDraftData,
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

  async createTransfer(data: CreateInventoryTransferData) {
    return this.prisma.$transaction(async (tx) => {
      const existingTransfer = await tx.inventoryTransfer.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: data.tenantId,
            idempotencyKey: data.idempotencyKey,
          },
        },
        include: { items: true },
      });

      if (existingTransfer) return existingTransfer;

      return tx.inventoryTransfer.create({
        data: {
          tenantId: data.tenantId,
          transferNumber: this.createTransferNumber(),
          sourceWarehouseId: data.sourceWarehouseId,
          destinationWarehouseId: data.destinationWarehouseId,
          reasonCode: data.reasonCode,
          notes: data.notes,
          idempotencyKey: data.idempotencyKey,
          createdByUserId: data.createdByUserId,
          items: {
            create: data.items.map((item) => ({
              tenantId: data.tenantId,
              skuId: item.skuId,
              quantity: item.quantity,
              unitCostSnapshot: item.unitCostSnapshot ?? undefined,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  async listTransfers(params: ListInventoryTransfersParams) {
    const { tenantId, page = 1, perPage = 10, status, warehouseId } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.InventoryTransferWhereInput = {
      tenantId,
      status,
      ...(warehouseId && {
        OR: [{ sourceWarehouseId: warehouseId }, { destinationWarehouseId: warehouseId }],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.inventoryTransfer.findMany({
        where,
        include: { items: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryTransfer.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  findTransferById(id: string, tenantId: string) {
    return this.prisma.inventoryTransfer.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
  }

  async updateTransferDraft(data: UpdateInventoryTransferDraftData) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id: data.transferId, tenantId: data.tenantId },
        include: { items: true },
      });

      if (!transfer) throw new NotFoundException('Inventory transfer not found.');
      if (transfer.status !== InventoryTransferStatus.DRAFT) {
        throw new BadRequestException('Only draft transfers can be updated.');
      }

      if (data.items) {
        await tx.inventoryTransferItem.deleteMany({
          where: { tenantId: data.tenantId, transferId: data.transferId },
        });
      }

      return tx.inventoryTransfer.update({
        where: { id: data.transferId },
        data: {
          ...(data.reasonCode && { reasonCode: data.reasonCode }),
          ...(typeof data.notes !== 'undefined' && { notes: data.notes }),
          ...(data.items && {
            items: {
              create: data.items.map((item) => ({
                tenantId: data.tenantId,
                skuId: item.skuId,
                quantity: item.quantity,
                unitCostSnapshot: item.unitCostSnapshot ?? undefined,
              })),
            },
          }),
        },
        include: { items: true },
      });
    });
  }

  async startTransfer(data: { transferId: string; tenantId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id: data.transferId, tenantId: data.tenantId },
        include: { items: true },
      });

      if (!transfer) throw new NotFoundException('Inventory transfer not found.');
      if (transfer.status !== InventoryTransferStatus.DRAFT) {
        throw new BadRequestException('Only draft transfers can be started.');
      }
      if (!transfer.items.length) {
        throw new BadRequestException('Transfer must contain at least one item.');
      }

      return tx.inventoryTransfer.update({
        where: { id: transfer.id },
        data: { status: InventoryTransferStatus.IN_TRANSIT },
        include: { items: true },
      });
    });
  }

  async completeTransfer(data: CompleteInventoryTransferData) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id: data.transferId, tenantId: data.tenantId },
        include: { items: true },
      });

      if (!transfer) throw new NotFoundException('Inventory transfer not found.');
      if (transfer.status === InventoryTransferStatus.COMPLETED) {
        return this.completedTransferResult(tx, transfer);
      }
      if (transfer.status === InventoryTransferStatus.CANCELED) {
        throw new BadRequestException('Canceled transfers cannot be completed.');
      }
      if (!transfer.items.length) {
        throw new BadRequestException('Transfer must contain at least one item.');
      }

      await this.lockTransferSourceBalances(tx, transfer);
      const sourceBalances = await this.findTransferSourceBalances(tx, transfer);
      this.assertTransferAvailability(transfer, sourceBalances);

      const movements: InventoryMovement[] = [];
      const balances: InventoryBalance[] = [];
      const occurredAt = new Date();

      for (const item of transfer.items) {
        const quantity = Number(item.quantity);
        const sourceBalance = sourceBalances.get(item.skuId);
        if (!sourceBalance) throw new NotFoundException('Inventory balance not found.');

        const movementOut = await tx.inventoryMovement.create({
          data: {
            tenantId: transfer.tenantId,
            skuId: item.skuId,
            warehouseId: transfer.sourceWarehouseId,
            type: InventoryMovementType.TRANSFER_OUT,
            quantityDelta: -quantity,
            unitCost: item.unitCostSnapshot ?? undefined,
            sourceType: 'INVENTORY_TRANSFER',
            sourceId: transfer.id,
            idempotencyKey: `transfer:${transfer.id}:${item.id}:out`,
            reasonCode: transfer.reasonCode,
            notes: transfer.notes,
            occurredAt,
            createdByUserId: data.actorUserId,
          },
        });
        const movementIn = await tx.inventoryMovement.create({
          data: {
            tenantId: transfer.tenantId,
            skuId: item.skuId,
            warehouseId: transfer.destinationWarehouseId,
            type: InventoryMovementType.TRANSFER_IN,
            quantityDelta: quantity,
            unitCost: item.unitCostSnapshot ?? undefined,
            sourceType: 'INVENTORY_TRANSFER',
            sourceId: transfer.id,
            idempotencyKey: `transfer:${transfer.id}:${item.id}:in`,
            reasonCode: transfer.reasonCode,
            notes: transfer.notes,
            occurredAt,
            createdByUserId: data.actorUserId,
          },
        });

        const reserved = Number(sourceBalance.reservedQuantity);
        const sourceOnHand = Number(sourceBalance.onHandQuantity) - quantity;
        const sourceAvailable = sourceOnHand - reserved;
        const updatedSourceBalance = await tx.inventoryBalance.update({
          where: {
            tenantId_skuId_warehouseId: {
              tenantId: transfer.tenantId,
              skuId: item.skuId,
              warehouseId: transfer.sourceWarehouseId,
            },
          },
          data: {
            onHandQuantity: sourceOnHand,
            availableQuantity: sourceAvailable,
            version: { increment: 1 },
          },
        });

        const destinationBalance = await tx.inventoryBalance.upsert({
          where: {
            tenantId_skuId_warehouseId: {
              tenantId: transfer.tenantId,
              skuId: item.skuId,
              warehouseId: transfer.destinationWarehouseId,
            },
          },
          create: {
            tenantId: transfer.tenantId,
            skuId: item.skuId,
            warehouseId: transfer.destinationWarehouseId,
            onHandQuantity: quantity,
            reservedQuantity: 0,
            availableQuantity: quantity,
            version: 1,
          },
          update: {
            onHandQuantity: { increment: quantity },
            availableQuantity: { increment: quantity },
            version: { increment: 1 },
          },
        });

        movements.push(movementOut, movementIn);
        balances.push(updatedSourceBalance, destinationBalance);
      }

      const updatedTransfer = await tx.inventoryTransfer.update({
        where: { id: transfer.id },
        data: {
          status: InventoryTransferStatus.COMPLETED,
          completedByUserId: data.actorUserId,
          completedAt: occurredAt,
        },
        include: { items: true },
      });

      const outboxEvent = await tx.outboxEvent.create({
        data: this.createOutboxPayload({
          tenantId: transfer.tenantId,
          aggregateType: 'InventoryTransfer',
          aggregateId: transfer.id,
          eventType: 'inventory.transfer.completed',
          payload: {
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            sourceWarehouseId: transfer.sourceWarehouseId,
            destinationWarehouseId: transfer.destinationWarehouseId,
            idempotencyKey: data.idempotencyKey,
            itemCount: transfer.items.length,
            movementIds: movements.map((movement) => movement.id),
          },
        }),
      });

      return { transfer: updatedTransfer, movements, balances, outboxEvent };
    });
  }

  async cancelTransfer(data: CancelInventoryTransferData) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id: data.transferId, tenantId: data.tenantId },
        include: { items: true },
      });

      if (!transfer) throw new NotFoundException('Inventory transfer not found.');
      if (transfer.status === InventoryTransferStatus.COMPLETED) {
        throw new BadRequestException('Completed transfers cannot be canceled.');
      }
      if (transfer.status === InventoryTransferStatus.CANCELED) return transfer;

      return tx.inventoryTransfer.update({
        where: { id: transfer.id },
        data: {
          status: InventoryTransferStatus.CANCELED,
          canceledByUserId: data.actorUserId,
          canceledAt: new Date(),
          reasonCode: data.reasonCode,
          notes: data.notes,
        },
        include: { items: true },
      });
    });
  }

  async createCycleCount(data: CreateCycleCountData) {
    return this.prisma.$transaction(async (tx) => {
      const existingCycleCount = await tx.cycleCount.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: data.tenantId,
            idempotencyKey: data.idempotencyKey,
          },
        },
        include: { items: true },
      });

      if (existingCycleCount) return existingCycleCount;

      return tx.cycleCount.create({
        data: {
          tenantId: data.tenantId,
          countNumber: this.createCycleCountNumber(),
          warehouseId: data.warehouseId,
          reasonCode: data.reasonCode,
          notes: data.notes,
          idempotencyKey: data.idempotencyKey,
          createdByUserId: data.createdByUserId,
          items: {
            create: data.items.map((item) => ({
              tenantId: data.tenantId,
              skuId: item.skuId,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  async listCycleCounts(params: ListCycleCountsParams) {
    const { tenantId, page = 1, perPage = 10, status, warehouseId } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.CycleCountWhereInput = { tenantId, status, warehouseId };

    const [data, total] = await Promise.all([
      this.prisma.cycleCount.findMany({
        where,
        include: { items: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cycleCount.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  findCycleCountById(id: string, tenantId: string) {
    return this.prisma.cycleCount.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
  }

  async openCycleCount(data: { cycleCountId: string; tenantId: string; actorUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const cycleCount = await tx.cycleCount.findFirst({
        where: { id: data.cycleCountId, tenantId: data.tenantId },
        include: { items: true },
      });

      if (!cycleCount) throw new NotFoundException('Cycle count not found.');
      if (cycleCount.status !== CycleCountStatus.DRAFT) {
        throw new BadRequestException('Only draft cycle counts can be opened.');
      }
      if (!cycleCount.items.length) {
        throw new BadRequestException('Cycle count must contain at least one item.');
      }

      const now = new Date();
      for (const item of cycleCount.items) {
        await this.lockBalance(tx, cycleCount.tenantId, item.skuId, cycleCount.warehouseId);
        const balance = await this.findLockedBalance(
          tx,
          cycleCount.tenantId,
          item.skuId,
          cycleCount.warehouseId,
        );

        await tx.cycleCountItem.update({
          where: { id: item.id },
          data: {
            systemOnHandAtOpen: balance.onHandQuantity,
            balanceVersionAtOpen: balance.version,
          },
        });
      }

      return tx.cycleCount.update({
        where: { id: cycleCount.id },
        data: {
          status: CycleCountStatus.OPEN,
          openedByUserId: data.actorUserId,
          openedAt: now,
        },
        include: { items: true },
      });
    });
  }

  async countCycleCountItem(data: CountCycleCountItemData) {
    return this.prisma.$transaction(async (tx) => {
      const cycleCount = await tx.cycleCount.findFirst({
        where: { id: data.cycleCountId, tenantId: data.tenantId },
        include: { items: true },
      });

      if (!cycleCount) throw new NotFoundException('Cycle count not found.');
      if (
        cycleCount.status !== CycleCountStatus.OPEN &&
        cycleCount.status !== CycleCountStatus.COUNTED
      ) {
        throw new BadRequestException('Only open cycle counts can receive counts.');
      }

      const item = cycleCount.items.find((currentItem) => currentItem.id === data.itemId);
      if (!item) throw new NotFoundException('Cycle count item not found.');
      if (item.systemOnHandAtOpen === null || item.balanceVersionAtOpen === null) {
        throw new BadRequestException('Cycle count item has not been opened.');
      }

      const countedQuantity = Math.abs(data.countedQuantity);
      const varianceQuantity = countedQuantity - Number(item.systemOnHandAtOpen);
      const now = new Date();

      await tx.cycleCountItem.update({
        where: { id: item.id },
        data: {
          countedQuantity,
          varianceQuantity,
          countedByUserId: data.actorUserId,
          countedAt: now,
        },
      });

      const remainingUncounted = await tx.cycleCountItem.count({
        where: {
          tenantId: data.tenantId,
          cycleCountId: cycleCount.id,
          countedQuantity: null,
        },
      });

      return tx.cycleCount.update({
        where: { id: cycleCount.id },
        data: {
          ...(remainingUncounted === 0 && {
            status: CycleCountStatus.COUNTED,
            countedAt: now,
          }),
        },
        include: { items: true },
      });
    });
  }

  async approveCycleCount(data: ApproveCycleCountData) {
    return this.prisma.$transaction(async (tx) => {
      const cycleCount = await tx.cycleCount.findFirst({
        where: { id: data.cycleCountId, tenantId: data.tenantId },
        include: { items: true },
      });

      if (!cycleCount) throw new NotFoundException('Cycle count not found.');
      if (cycleCount.status === CycleCountStatus.APPROVED) {
        return this.approvedCycleCountResult(tx, cycleCount);
      }
      if (cycleCount.status === CycleCountStatus.CANCELED) {
        throw new BadRequestException('Canceled cycle counts cannot be approved.');
      }
      if (cycleCount.status !== CycleCountStatus.COUNTED) {
        throw new BadRequestException('Only counted cycle counts can be approved.');
      }

      const movements: InventoryMovement[] = [];
      const balances: InventoryBalance[] = [];
      const occurredAt = new Date();

      for (const item of cycleCount.items) {
        if (
          item.systemOnHandAtOpen === null ||
          item.balanceVersionAtOpen === null ||
          item.countedQuantity === null ||
          item.varianceQuantity === null
        ) {
          throw new BadRequestException('Cycle count has uncounted items.');
        }

        await this.lockBalance(tx, cycleCount.tenantId, item.skuId, cycleCount.warehouseId);
        const balance = await this.findLockedBalance(
          tx,
          cycleCount.tenantId,
          item.skuId,
          cycleCount.warehouseId,
        );

        if (balance.version !== item.balanceVersionAtOpen) {
          throw new ConflictException('CYCLE_COUNT_STALE_BALANCE');
        }

        const variance = Number(item.varianceQuantity);
        if (variance === 0) continue;

        const nextOnHand = Number(balance.onHandQuantity) + variance;
        const reserved = Number(balance.reservedQuantity);
        if (nextOnHand < reserved) {
          throw new BadRequestException('Cycle count adjustment would make stock unavailable.');
        }

        const movement = await tx.inventoryMovement.create({
          data: {
            tenantId: cycleCount.tenantId,
            skuId: item.skuId,
            warehouseId: cycleCount.warehouseId,
            type:
              variance > 0
                ? InventoryMovementType.ADJUSTMENT_IN
                : InventoryMovementType.ADJUSTMENT_OUT,
            quantityDelta: variance,
            sourceType: 'CYCLE_COUNT',
            sourceId: cycleCount.id,
            idempotencyKey: `cycle-count:${cycleCount.id}:${item.id}:adjustment`,
            reasonCode: data.reasonCode,
            notes: data.notes,
            occurredAt,
            createdByUserId: data.actorUserId,
          },
        });

        await tx.cycleCountItem.update({
          where: { id: item.id },
          data: { adjustmentMovementId: movement.id },
        });

        const updatedBalance = await tx.inventoryBalance.update({
          where: {
            tenantId_skuId_warehouseId: {
              tenantId: cycleCount.tenantId,
              skuId: item.skuId,
              warehouseId: cycleCount.warehouseId,
            },
          },
          data: {
            onHandQuantity: nextOnHand,
            availableQuantity: nextOnHand - reserved,
            version: { increment: 1 },
          },
        });

        movements.push(movement);
        balances.push(updatedBalance);
      }

      const updatedCycleCount = await tx.cycleCount.update({
        where: { id: cycleCount.id },
        data: {
          status: CycleCountStatus.APPROVED,
          reasonCode: data.reasonCode,
          notes: data.notes,
          approvedByUserId: data.actorUserId,
          approvedAt: occurredAt,
          adjustedAt: movements.length ? occurredAt : null,
        },
        include: { items: true },
      });

      const outboxEvent = await tx.outboxEvent.create({
        data: this.createOutboxPayload({
          tenantId: cycleCount.tenantId,
          aggregateType: 'CycleCount',
          aggregateId: cycleCount.id,
          eventType: 'inventory.cycle_count.adjusted',
          payload: {
            cycleCountId: cycleCount.id,
            countNumber: cycleCount.countNumber,
            warehouseId: cycleCount.warehouseId,
            idempotencyKey: data.idempotencyKey,
            adjustedItemCount: movements.length,
            movementIds: movements.map((movement) => movement.id),
          },
        }),
      });

      return {
        cycleCount: updatedCycleCount,
        movements,
        balances,
        outboxEvent,
      };
    });
  }

  async cancelCycleCount(data: CancelCycleCountData) {
    return this.prisma.$transaction(async (tx) => {
      const cycleCount = await tx.cycleCount.findFirst({
        where: { id: data.cycleCountId, tenantId: data.tenantId },
        include: { items: true },
      });

      if (!cycleCount) throw new NotFoundException('Cycle count not found.');
      if (cycleCount.status === CycleCountStatus.APPROVED) {
        throw new BadRequestException('Approved cycle counts cannot be canceled.');
      }
      if (cycleCount.status === CycleCountStatus.CANCELED) return cycleCount;

      return tx.cycleCount.update({
        where: { id: cycleCount.id },
        data: {
          status: CycleCountStatus.CANCELED,
          reasonCode: data.reasonCode,
          notes: data.notes,
          canceledByUserId: data.actorUserId,
          canceledAt: new Date(),
        },
        include: { items: true },
      });
    });
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
    aggregateType?: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Prisma.OutboxEventUncheckedCreateInput {
    const payloadHash = createHash('sha256').update(JSON.stringify(input.payload)).digest('hex');

    return {
      tenantId: input.tenantId,
      aggregateType: input.aggregateType ?? 'InventoryReservation',
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

  private createTransferNumber() {
    return `TRF-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private createCycleCountNumber() {
    return `CC-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private async completedTransferResult(
    tx: Prisma.TransactionClient,
    transfer: Prisma.InventoryTransferGetPayload<{ include: { items: true } }>,
  ) {
    const [movements, balances, outboxEvent] = await Promise.all([
      tx.inventoryMovement.findMany({
        where: {
          tenantId: transfer.tenantId,
          sourceType: 'INVENTORY_TRANSFER',
          sourceId: transfer.id,
        },
        orderBy: { createdAt: 'asc' },
      }),
      tx.inventoryBalance.findMany({
        where: {
          tenantId: transfer.tenantId,
          skuId: { in: transfer.items.map((item) => item.skuId) },
          warehouseId: { in: [transfer.sourceWarehouseId, transfer.destinationWarehouseId] },
        },
      }),
      tx.outboxEvent.findFirst({
        where: {
          tenantId: transfer.tenantId,
          aggregateType: 'InventoryTransfer',
          aggregateId: transfer.id,
          eventType: 'inventory.transfer.completed',
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { transfer, movements, balances, ...(outboxEvent && { outboxEvent }) };
  }

  private async lockTransferSourceBalances(
    tx: Prisma.TransactionClient,
    transfer: Prisma.InventoryTransferGetPayload<{ include: { items: true } }>,
  ) {
    const skuIds = [...new Set(transfer.items.map((item) => item.skuId))].sort();
    for (const skuId of skuIds) {
      await this.lockBalance(tx, transfer.tenantId, skuId, transfer.sourceWarehouseId);
    }
  }

  private async findTransferSourceBalances(
    tx: Prisma.TransactionClient,
    transfer: Prisma.InventoryTransferGetPayload<{ include: { items: true } }>,
  ) {
    const balances = await tx.inventoryBalance.findMany({
      where: {
        tenantId: transfer.tenantId,
        warehouseId: transfer.sourceWarehouseId,
        skuId: { in: transfer.items.map((item) => item.skuId) },
      },
    });

    return new Map(balances.map((balance) => [balance.skuId, balance]));
  }

  private assertTransferAvailability(
    transfer: Prisma.InventoryTransferGetPayload<{ include: { items: true } }>,
    sourceBalances: Map<string, { availableQuantity: Prisma.Decimal }>,
  ) {
    for (const item of transfer.items) {
      const balance = sourceBalances.get(item.skuId);
      if (!balance) throw new NotFoundException('Inventory balance not found.');
      if (Number(balance.availableQuantity) < Number(item.quantity)) {
        throw new BadRequestException('Insufficient available quantity for transfer.');
      }
    }
  }

  private async approvedCycleCountResult(
    tx: Prisma.TransactionClient,
    cycleCount: Prisma.CycleCountGetPayload<{ include: { items: true } }>,
  ) {
    const [movements, balances, outboxEvent] = await Promise.all([
      tx.inventoryMovement.findMany({
        where: {
          tenantId: cycleCount.tenantId,
          sourceType: 'CYCLE_COUNT',
          sourceId: cycleCount.id,
        },
        orderBy: { createdAt: 'asc' },
      }),
      tx.inventoryBalance.findMany({
        where: {
          tenantId: cycleCount.tenantId,
          skuId: { in: cycleCount.items.map((item) => item.skuId) },
          warehouseId: cycleCount.warehouseId,
        },
      }),
      tx.outboxEvent.findFirst({
        where: {
          tenantId: cycleCount.tenantId,
          aggregateType: 'CycleCount',
          aggregateId: cycleCount.id,
          eventType: 'inventory.cycle_count.adjusted',
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { cycleCount, movements, balances, ...(outboxEvent && { outboxEvent }) };
  }
}
