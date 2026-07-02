import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryMovementType, InventoryReservationStatus } from '@prisma/client';

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
