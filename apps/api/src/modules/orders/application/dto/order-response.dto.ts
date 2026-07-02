import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InternalOrderStatus } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() orderId: string;
  @ApiProperty() skuId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() quantity: string;
  @ApiPropertyOptional() reservationId?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ enum: InternalOrderStatus }) status: InternalOrderStatus;
  @ApiProperty() idempotencyKey: string;
  @ApiPropertyOptional() customerName?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() confirmedAt?: Date;
  @ApiPropertyOptional() cancelledAt?: Date;
  @ApiPropertyOptional() fulfilledAt?: Date;
  @ApiPropertyOptional() createdByUserId?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [OrderItemResponseDto] }) items: OrderItemResponseDto[];
}

export class PaginatedOrdersMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() perPage: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] }) data: OrderResponseDto[];
  @ApiProperty({ type: PaginatedOrdersMetaDto }) meta: PaginatedOrdersMetaDto;
}

export class OrderMutationResponseDto {
  @ApiProperty({ type: OrderResponseDto }) order: OrderResponseDto;
}
