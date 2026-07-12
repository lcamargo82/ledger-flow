import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryMovementType,
  InventoryReservationStatus,
  InventoryTransferStatus,
  CycleCountStatus,
} from '@prisma/client';

export class WarehouseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class InventoryMovementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() skuId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty({ enum: InventoryMovementType }) type: InventoryMovementType;
  @ApiProperty() quantityDelta: string;
  @ApiPropertyOptional() unitCost?: string;
  @ApiProperty() sourceType: string;
  @ApiProperty() sourceId: string;
  @ApiProperty() idempotencyKey: string;
  @ApiPropertyOptional() reasonCode?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() occurredAt: Date;
  @ApiPropertyOptional() createdByUserId?: string;
  @ApiProperty() createdAt: Date;
}

export class InventoryBalanceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() skuId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() onHandQuantity: string;
  @ApiProperty() reservedQuantity: string;
  @ApiProperty() availableQuantity: string;
  @ApiProperty() version: number;
  @ApiProperty() updatedAt: Date;
}

export class InventoryReservationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() skuId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() quantity: string;
  @ApiProperty({ enum: InventoryReservationStatus }) status: InventoryReservationStatus;
  @ApiProperty() sourceType: string;
  @ApiProperty() sourceId: string;
  @ApiProperty() idempotencyKey: string;
  @ApiProperty() reasonCode: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() createdByUserId?: string;
  @ApiPropertyOptional() releasedAt?: Date;
  @ApiPropertyOptional() consumedAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class InventoryTransferItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() transferId: string;
  @ApiProperty() skuId: string;
  @ApiProperty() quantity: string;
  @ApiPropertyOptional() unitCostSnapshot?: string;
  @ApiProperty() createdAt: Date;
}

export class InventoryTransferResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() transferNumber: string;
  @ApiProperty() sourceWarehouseId: string;
  @ApiProperty() destinationWarehouseId: string;
  @ApiProperty({ enum: InventoryTransferStatus }) status: InventoryTransferStatus;
  @ApiProperty() reasonCode: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() idempotencyKey: string;
  @ApiPropertyOptional() createdByUserId?: string;
  @ApiPropertyOptional() completedByUserId?: string;
  @ApiPropertyOptional() canceledByUserId?: string;
  @ApiPropertyOptional() completedAt?: Date;
  @ApiPropertyOptional() canceledAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [InventoryTransferItemResponseDto] })
  items: InventoryTransferItemResponseDto[];
}

export class CycleCountItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() cycleCountId: string;
  @ApiProperty() skuId: string;
  @ApiPropertyOptional() systemOnHandAtOpen?: string;
  @ApiPropertyOptional() balanceVersionAtOpen?: number;
  @ApiPropertyOptional() countedQuantity?: string;
  @ApiPropertyOptional() varianceQuantity?: string;
  @ApiPropertyOptional() countedByUserId?: string;
  @ApiPropertyOptional() countedAt?: Date;
  @ApiPropertyOptional() adjustmentMovementId?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class CycleCountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() countNumber: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty({ enum: CycleCountStatus }) status: CycleCountStatus;
  @ApiPropertyOptional() reasonCode?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() idempotencyKey: string;
  @ApiPropertyOptional() createdByUserId?: string;
  @ApiPropertyOptional() openedByUserId?: string;
  @ApiPropertyOptional() approvedByUserId?: string;
  @ApiPropertyOptional() canceledByUserId?: string;
  @ApiPropertyOptional() openedAt?: Date;
  @ApiPropertyOptional() countedAt?: Date;
  @ApiPropertyOptional() approvedAt?: Date;
  @ApiPropertyOptional() adjustedAt?: Date;
  @ApiPropertyOptional() canceledAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [CycleCountItemResponseDto] })
  items: CycleCountItemResponseDto[];
}

export class PaginatedMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() perPage: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedWarehousesResponseDto {
  @ApiProperty({ type: [WarehouseResponseDto] }) data: WarehouseResponseDto[];
  @ApiProperty({ type: PaginatedMetaDto }) meta: PaginatedMetaDto;
}

export class PaginatedMovementsResponseDto {
  @ApiProperty({ type: [InventoryMovementResponseDto] }) data: InventoryMovementResponseDto[];
  @ApiProperty({ type: PaginatedMetaDto }) meta: PaginatedMetaDto;
}

export class PaginatedBalancesResponseDto {
  @ApiProperty({ type: [InventoryBalanceResponseDto] }) data: InventoryBalanceResponseDto[];
  @ApiProperty({ type: PaginatedMetaDto }) meta: PaginatedMetaDto;
}

export class PaginatedReservationsResponseDto {
  @ApiProperty({ type: [InventoryReservationResponseDto] })
  data: InventoryReservationResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto }) meta: PaginatedMetaDto;
}

export class PaginatedTransfersResponseDto {
  @ApiProperty({ type: [InventoryTransferResponseDto] }) data: InventoryTransferResponseDto[];
  @ApiProperty({ type: PaginatedMetaDto }) meta: PaginatedMetaDto;
}

export class PaginatedCycleCountsResponseDto {
  @ApiProperty({ type: [CycleCountResponseDto] }) data: CycleCountResponseDto[];
  @ApiProperty({ type: PaginatedMetaDto }) meta: PaginatedMetaDto;
}

export class WarehouseMutationResponseDto {
  @ApiProperty({ type: WarehouseResponseDto }) warehouse: WarehouseResponseDto;
}

export class InventoryAdjustmentResponseDto {
  @ApiProperty({ type: InventoryMovementResponseDto }) movement: InventoryMovementResponseDto;
  @ApiProperty({ type: InventoryBalanceResponseDto }) balance: InventoryBalanceResponseDto;
}

export class InventoryReservationOperationResponseDto {
  @ApiProperty({ type: InventoryReservationResponseDto })
  reservation: InventoryReservationResponseDto;

  @ApiProperty({ type: InventoryMovementResponseDto })
  movement: InventoryMovementResponseDto;

  @ApiProperty({ type: InventoryBalanceResponseDto })
  balance: InventoryBalanceResponseDto;
}

export class InventoryTransferMutationResponseDto {
  @ApiProperty({ type: InventoryTransferResponseDto })
  transfer: InventoryTransferResponseDto;
}

export class InventoryTransferCompletionResponseDto {
  @ApiProperty({ type: InventoryTransferResponseDto })
  transfer: InventoryTransferResponseDto;

  @ApiProperty({ type: [InventoryMovementResponseDto] })
  movements: InventoryMovementResponseDto[];

  @ApiProperty({ type: [InventoryBalanceResponseDto] })
  balances: InventoryBalanceResponseDto[];
}

export class CycleCountMutationResponseDto {
  @ApiProperty({ type: CycleCountResponseDto })
  cycleCount: CycleCountResponseDto;
}

export class CycleCountApprovalResponseDto {
  @ApiProperty({ type: CycleCountResponseDto })
  cycleCount: CycleCountResponseDto;

  @ApiProperty({ type: [InventoryMovementResponseDto] })
  movements: InventoryMovementResponseDto[];

  @ApiProperty({ type: [InventoryBalanceResponseDto] })
  balances: InventoryBalanceResponseDto[];
}
