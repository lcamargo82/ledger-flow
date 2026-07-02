import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  AdjustmentData,
  InventoryRepository,
  ListInventoryParams,
  ListWarehousesParams,
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
