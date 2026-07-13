import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ChannelInventorySyncService } from '../../../channels/application/services/channel-inventory-sync.service';
import { CreateCycleCountDto } from '../dto/create-cycle-count.dto';
import { CreateInventoryTransferDto } from '../dto/create-inventory-transfer.dto';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import {
  ApproveCycleCountDto,
  CancelCycleCountDto,
  CountCycleCountItemDto,
} from '../dto/cycle-count-transition.dto';
import {
  CompleteInventoryTransferDto,
  CancelInventoryTransferDto,
} from '../dto/inventory-transfer-transition.dto';
import { ListCycleCountsQueryDto } from '../dto/list-cycle-counts-query.dto';
import { ListInventoryQueryDto } from '../dto/list-inventory-query.dto';
import { ListInventoryTransfersQueryDto } from '../dto/list-inventory-transfers-query.dto';
import { ListWarehousesQueryDto } from '../dto/list-warehouses-query.dto';
import { RecordAdjustmentDto } from '../dto/record-adjustment.dto';
import { ReservationTransitionDto } from '../dto/reservation-transition.dto';
import { ReserveStockDto } from '../dto/reserve-stock.dto';
import { UpdateInventoryTransferDto } from '../dto/update-inventory-transfer.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { INVENTORY_REPOSITORY } from '../../domain/repositories/inventory.repository';
import type { InventoryRepository } from '../../domain/repositories/inventory.repository';
import {
  InventoryReasonContext,
  getInventoryReasonCodes,
  isInventoryReasonCode,
} from '../../domain/constants/inventory-reason-code-registry';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepository: InventoryRepository,
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => ChannelInventorySyncService))
    private readonly channelInventorySyncService?: ChannelInventorySyncService,
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

    await this.publishBalanceChanged(result.balance.id, tenantId, result.balance);

    return result;
  }

  listBalances(tenantId: string, query: ListInventoryQueryDto) {
    return this.inventoryRepository.listBalances({ tenantId, ...query });
  }

  listMovements(tenantId: string, query: ListInventoryQueryDto) {
    return this.inventoryRepository.listMovements({ tenantId, ...query });
  }

  async reserveStock(tenantId: string, actorUserId: string, dto: ReserveStockDto) {
    this.assertReason(dto.reasonCode);

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

    const result = await this.inventoryRepository.reserveStock({
      tenantId,
      skuId: dto.skuId,
      warehouseId: dto.warehouseId,
      quantity: dto.quantity,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      idempotencyKey: dto.idempotencyKey,
      reasonCode: dto.reasonCode,
      notes: dto.notes ?? null,
      createdByUserId: actorUserId,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.reservation.created',
      'InventoryReservation',
      result.reservation.id,
      {
        skuId: dto.skuId,
        warehouseId: dto.warehouseId,
        quantity: dto.quantity,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        reasonCode: dto.reasonCode,
      },
    );

    await this.publishBalanceChanged(result.balance.id, tenantId, result.balance);

    return result;
  }

  listReservations(tenantId: string, query: ListInventoryQueryDto) {
    return this.inventoryRepository.listReservations({ tenantId, ...query });
  }

  async createTransfer(tenantId: string, actorUserId: string, dto: CreateInventoryTransferDto) {
    this.assertTransferPayload(dto);
    await this.assertTransferReferences(tenantId, dto);

    const transfer = await this.inventoryRepository.createTransfer({
      tenantId,
      sourceWarehouseId: dto.sourceWarehouseId,
      destinationWarehouseId: dto.destinationWarehouseId,
      reasonCode: dto.reasonCode,
      notes: dto.notes ?? null,
      idempotencyKey: dto.idempotencyKey,
      createdByUserId: actorUserId,
      items: dto.items,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.transfer.created',
      'InventoryTransfer',
      transfer.id,
      {
        sourceWarehouseId: transfer.sourceWarehouseId,
        destinationWarehouseId: transfer.destinationWarehouseId,
        itemCount: transfer.items.length,
        reasonCode: transfer.reasonCode,
      },
    );

    return transfer;
  }

  listTransfers(tenantId: string, query: ListInventoryTransfersQueryDto) {
    return this.inventoryRepository.listTransfers({ tenantId, ...query });
  }

  async getTransfer(id: string, tenantId: string) {
    const transfer = await this.inventoryRepository.findTransferById(id, tenantId);
    if (!transfer) {
      throw new NotFoundException('Inventory transfer not found.');
    }

    return transfer;
  }

  async updateTransferDraft(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: UpdateInventoryTransferDto,
  ) {
    if (dto.reasonCode) this.assertTransferReason(dto.reasonCode, dto.notes);
    if (dto.items) await this.assertTransferItems(tenantId, dto.items);

    const transfer = await this.inventoryRepository.updateTransferDraft({
      transferId: id,
      tenantId,
      reasonCode: dto.reasonCode,
      notes: dto.notes,
      items: dto.items,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.transfer.updated',
      'InventoryTransfer',
      transfer.id,
      { itemCount: transfer.items.length },
    );

    return transfer;
  }

  async startTransfer(id: string, tenantId: string, actorUserId: string) {
    const transfer = await this.inventoryRepository.startTransfer({
      transferId: id,
      tenantId,
      actorUserId,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.transfer.started',
      'InventoryTransfer',
      transfer.id,
    );

    return transfer;
  }

  async completeTransfer(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: CompleteInventoryTransferDto,
  ) {
    const result = await this.inventoryRepository.completeTransfer({
      transferId: id,
      tenantId,
      actorUserId,
      idempotencyKey: dto.idempotencyKey,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.transfer.completed',
      'InventoryTransfer',
      result.transfer.id,
      {
        movementIds: result.movements.map((movement) => movement.id),
        outboxEventId: result.outboxEvent?.id,
      },
    );

    await Promise.all(
      result.balances.map((balance) => this.publishBalanceChanged(balance.id, tenantId, balance)),
    );

    return result;
  }

  async cancelTransfer(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: CancelInventoryTransferDto,
  ) {
    this.assertTransferReason(dto.reasonCode, dto.notes);

    const transfer = await this.inventoryRepository.cancelTransfer({
      transferId: id,
      tenantId,
      actorUserId,
      reasonCode: dto.reasonCode,
      notes: dto.notes ?? null,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.transfer.canceled',
      'InventoryTransfer',
      transfer.id,
      { reasonCode: dto.reasonCode },
    );

    return transfer;
  }

  async createCycleCount(tenantId: string, actorUserId: string, dto: CreateCycleCountDto) {
    this.assertCycleCountReason(dto.reasonCode, dto.notes);
    await this.assertCycleCountReferences(tenantId, dto.warehouseId, dto.items);

    const cycleCount = await this.inventoryRepository.createCycleCount({
      tenantId,
      warehouseId: dto.warehouseId,
      reasonCode: dto.reasonCode,
      notes: dto.notes ?? null,
      idempotencyKey: dto.idempotencyKey,
      createdByUserId: actorUserId,
      items: dto.items,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.cycle_count.created',
      'CycleCount',
      cycleCount.id,
      {
        warehouseId: cycleCount.warehouseId,
        itemCount: cycleCount.items.length,
        reasonCode: cycleCount.reasonCode,
      },
    );

    return cycleCount;
  }

  listCycleCounts(tenantId: string, query: ListCycleCountsQueryDto) {
    return this.inventoryRepository.listCycleCounts({ tenantId, ...query });
  }

  async getCycleCount(id: string, tenantId: string) {
    const cycleCount = await this.inventoryRepository.findCycleCountById(id, tenantId);
    if (!cycleCount) {
      throw new NotFoundException('Cycle count not found.');
    }

    return cycleCount;
  }

  async openCycleCount(id: string, tenantId: string, actorUserId: string) {
    const cycleCount = await this.inventoryRepository.openCycleCount({
      cycleCountId: id,
      tenantId,
      actorUserId,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.cycle_count.opened',
      'CycleCount',
      cycleCount.id,
      { itemCount: cycleCount.items.length },
    );

    return cycleCount;
  }

  countCycleCountItem(
    id: string,
    itemId: string,
    tenantId: string,
    actorUserId: string,
    dto: CountCycleCountItemDto,
  ) {
    return this.inventoryRepository.countCycleCountItem({
      cycleCountId: id,
      itemId,
      tenantId,
      actorUserId,
      countedQuantity: dto.countedQuantity,
    });
  }

  async approveCycleCount(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: ApproveCycleCountDto,
  ) {
    this.assertCycleCountReason(dto.reasonCode, dto.notes);

    const result = await this.inventoryRepository.approveCycleCount({
      cycleCountId: id,
      tenantId,
      actorUserId,
      reasonCode: dto.reasonCode,
      idempotencyKey: dto.idempotencyKey,
      notes: dto.notes ?? null,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.cycle_count.approved',
      'CycleCount',
      result.cycleCount.id,
      {
        movementIds: result.movements.map((movement) => movement.id),
        outboxEventId: result.outboxEvent?.id,
      },
    );

    await Promise.all(
      result.balances.map((balance) => this.publishBalanceChanged(balance.id, tenantId, balance)),
    );

    return result;
  }

  async cancelCycleCount(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: CancelCycleCountDto,
  ) {
    this.assertCycleCountReason(dto.reasonCode, dto.notes);

    const cycleCount = await this.inventoryRepository.cancelCycleCount({
      cycleCountId: id,
      tenantId,
      actorUserId,
      reasonCode: dto.reasonCode,
      notes: dto.notes ?? null,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.cycle_count.canceled',
      'CycleCount',
      cycleCount.id,
      { reasonCode: dto.reasonCode },
    );

    return cycleCount;
  }

  async releaseReservation(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: ReservationTransitionDto,
  ) {
    this.assertReason(dto.reasonCode);

    const result = await this.inventoryRepository.releaseReservation({
      reservationId: id,
      tenantId,
      reasonCode: dto.reasonCode,
      idempotencyKey: dto.idempotencyKey,
      notes: dto.notes ?? null,
      actorUserId,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.reservation.released',
      'InventoryReservation',
      result.reservation.id,
      {
        reasonCode: dto.reasonCode,
      },
    );

    await this.publishBalanceChanged(result.balance.id, tenantId, result.balance);

    return result;
  }

  async consumeReservation(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: ReservationTransitionDto,
  ) {
    this.assertReason(dto.reasonCode);

    const result = await this.inventoryRepository.consumeReservation({
      reservationId: id,
      tenantId,
      reasonCode: dto.reasonCode,
      idempotencyKey: dto.idempotencyKey,
      notes: dto.notes ?? null,
      actorUserId,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'inventory.reservation.consumed',
      'InventoryReservation',
      result.reservation.id,
      {
        reasonCode: dto.reasonCode,
        movementId: result.movement.id,
      },
    );

    await this.publishBalanceChanged(result.balance.id, tenantId, result.balance);

    return result;
  }

  private assertReason(reasonCode: string) {
    if (!reasonCode?.trim()) {
      throw new BadRequestException('Reason code is required.');
    }
  }

  private assertTransferPayload(dto: CreateInventoryTransferDto) {
    this.assertTransferReason(dto.reasonCode, dto.notes);
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different.');
    }

    this.assertUniqueTransferItems(dto.items);
  }

  private async assertTransferReferences(
    tenantId: string,
    dto: Pick<CreateInventoryTransferDto, 'sourceWarehouseId' | 'destinationWarehouseId' | 'items'>,
  ) {
    const [sourceWarehouse, destinationWarehouse] = await Promise.all([
      this.inventoryRepository.findWarehouseById(dto.sourceWarehouseId, tenantId),
      this.inventoryRepository.findWarehouseById(dto.destinationWarehouseId, tenantId),
    ]);

    if (!sourceWarehouse?.isActive || !destinationWarehouse?.isActive) {
      throw new NotFoundException('Warehouse not found.');
    }

    await this.assertTransferItems(tenantId, dto.items);
  }

  private async assertTransferItems(
    tenantId: string,
    items: Array<{ skuId: string; quantity: number }>,
  ) {
    this.assertUniqueTransferItems(items);

    const skus = await Promise.all(
      [...new Set(items.map((item) => item.skuId))].map((skuId) =>
        this.inventoryRepository.findSkuById(skuId, tenantId),
      ),
    );

    if (skus.some((sku) => !sku)) {
      throw new NotFoundException('SKU not found.');
    }
  }

  private assertUniqueTransferItems(items: Array<{ skuId: string }>) {
    const skuIds = items.map((item) => item.skuId);
    if (new Set(skuIds).size !== skuIds.length) {
      throw new BadRequestException('Transfer items must not contain duplicated SKUs.');
    }
  }

  private assertTransferReason(reasonCode: string, notes?: string | null) {
    this.assertReason(reasonCode);

    if (!isInventoryReasonCode(InventoryReasonContext.TRANSFER, reasonCode)) {
      throw new BadRequestException('Invalid transfer reason code.');
    }

    const definition = getInventoryReasonCodes(InventoryReasonContext.TRANSFER).find(
      (reason) => reason.code === reasonCode,
    );
    if (definition?.requiresNotes && !notes?.trim()) {
      throw new BadRequestException('Notes are required for this transfer reason code.');
    }
  }

  private async assertCycleCountReferences(
    tenantId: string,
    warehouseId: string,
    items: Array<{ skuId: string }>,
  ) {
    const warehouse = await this.inventoryRepository.findWarehouseById(warehouseId, tenantId);
    if (!warehouse?.isActive) {
      throw new NotFoundException('Warehouse not found.');
    }

    this.assertUniqueCycleCountItems(items);

    const skus = await Promise.all(
      [...new Set(items.map((item) => item.skuId))].map((skuId) =>
        this.inventoryRepository.findSkuById(skuId, tenantId),
      ),
    );

    if (skus.some((sku) => !sku)) {
      throw new NotFoundException('SKU not found.');
    }
  }

  private assertUniqueCycleCountItems(items: Array<{ skuId: string }>) {
    const skuIds = items.map((item) => item.skuId);
    if (new Set(skuIds).size !== skuIds.length) {
      throw new BadRequestException('Cycle count items must not contain duplicated SKUs.');
    }
  }

  private assertCycleCountReason(reasonCode: string, notes?: string | null) {
    this.assertReason(reasonCode);

    if (!isInventoryReasonCode(InventoryReasonContext.CYCLE_COUNT, reasonCode)) {
      throw new BadRequestException('Invalid cycle count reason code.');
    }

    const definition = getInventoryReasonCodes(InventoryReasonContext.CYCLE_COUNT).find(
      (reason) => reason.code === reasonCode,
    );
    if (definition?.requiresNotes && !notes?.trim()) {
      throw new BadRequestException('Notes are required for this cycle count reason code.');
    }
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

  private async publishBalanceChanged(
    balanceId: string,
    tenantId: string,
    balance: {
      id?: string;
      skuId: string;
      warehouseId: string;
      availableQuantity: Prisma.Decimal | string | number;
      onHandQuantity?: Prisma.Decimal | string | number;
      reservedQuantity?: Prisma.Decimal | string | number;
      version?: number;
    },
  ) {
    const payload = {
      balanceId,
      skuId: balance.skuId,
      warehouseId: balance.warehouseId,
      availableQuantity: Number(balance.availableQuantity),
      onHandQuantity:
        typeof balance.onHandQuantity === 'undefined' ? undefined : Number(balance.onHandQuantity),
      reservedQuantity:
        typeof balance.reservedQuantity === 'undefined'
          ? undefined
          : Number(balance.reservedQuantity),
      version: balance.version,
    };

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'InventoryBalance',
        aggregateId: balanceId,
        eventType: 'inventory.balance.changed',
        eventVersion: 1,
        payload: payload,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });

    await this.channelInventorySyncService?.enqueueBalanceChanged({
      tenantId,
      skuId: balance.skuId,
      availableQuantity: Number(balance.availableQuantity),
      balanceId,
    });
  }
}
