import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { ListInventoryQueryDto } from '../dto/list-inventory-query.dto';
import { ListWarehousesQueryDto } from '../dto/list-warehouses-query.dto';
import { RecordAdjustmentDto } from '../dto/record-adjustment.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { INVENTORY_REPOSITORY } from '../../domain/repositories/inventory.repository';
import type { InventoryRepository } from '../../domain/repositories/inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepository: InventoryRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createWarehouse(tenantId: string, actorUserId: string, dto: CreateWarehouseDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.inventoryRepository.findWarehouseByCode(code, tenantId);
    if (existing) {
      throw new ConflictException('Warehouse code already exists.');
    }

    const warehouse = await this.inventoryRepository.createWarehouse({
      tenantId,
      code,
      name: dto.name,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.warehouse.created',
      'Warehouse',
      warehouse.id,
    );

    return warehouse;
  }

  listWarehouses(tenantId: string, query: ListWarehousesQueryDto) {
    return this.inventoryRepository.listWarehouses({ tenantId, ...query });
  }

  async updateWarehouse(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: UpdateWarehouseDto,
  ) {
    const warehouse = await this.inventoryRepository.findWarehouseById(id, tenantId);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }

    const updatedWarehouse = await this.inventoryRepository.updateWarehouse(id, tenantId, dto);

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.warehouse.updated',
      'Warehouse',
      updatedWarehouse.id,
    );

    return updatedWarehouse;
  }

  async recordAdjustment(tenantId: string, actorUserId: string, dto: RecordAdjustmentDto) {
    if (
      dto.type !== InventoryMovementType.ADJUSTMENT_IN &&
      dto.type !== InventoryMovementType.ADJUSTMENT_OUT
    ) {
      throw new BadRequestException('Only adjustment movement types are allowed.');
    }

    const [warehouse, sku] = await Promise.all([
      this.inventoryRepository.findWarehouseById(dto.warehouseId, tenantId),
      this.inventoryRepository.findSkuById(dto.skuId, tenantId),
    ]);

    if (!warehouse || !warehouse.isActive) {
      throw new NotFoundException('Warehouse not found.');
    }

    if (!sku) {
      throw new NotFoundException('SKU not found.');
    }

    const result = await this.inventoryRepository.recordAdjustment({
      tenantId,
      skuId: dto.skuId,
      warehouseId: dto.warehouseId,
      type: dto.type,
      quantityDelta: dto.quantity,
      unitCost: Number(sku.averageCost),
      sourceType: 'MANUAL_ADJUSTMENT',
      sourceId: randomUUID(),
      idempotencyKey: randomUUID(),
      reasonCode: dto.reasonCode,
      notes: dto.notes ?? null,
      occurredAt: new Date(),
      createdByUserId: actorUserId,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.adjustment.recorded',
      'InventoryMovement',
      result.movement.id,
      {
        skuId: dto.skuId,
        warehouseId: dto.warehouseId,
        type: dto.type,
        quantity: dto.quantity,
        reasonCode: dto.reasonCode,
      },
    );

    return result;
  }

  listBalances(tenantId: string, query: ListInventoryQueryDto) {
    return this.inventoryRepository.listBalances({ tenantId, ...query });
  }

  listMovements(tenantId: string, query: ListInventoryQueryDto) {
    return this.inventoryRepository.listMovements({ tenantId, ...query });
  }

  private async auditLog(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType,
        entityId,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }
}
