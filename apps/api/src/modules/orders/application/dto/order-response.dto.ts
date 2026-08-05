import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelProvider, InventoryReservationStatus, InternalOrderStatus } from '@prisma/client';

export class OrderItemReservationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: InventoryReservationStatus }) status: InventoryReservationStatus;
}

export class OrderItemSkuResponseDto {
  @ApiProperty() skuDisplay: string;
  @ApiProperty() product: { name: string };
}

export class OrderItemWarehouseResponseDto {
  @ApiProperty() name: string;
  @ApiProperty() code: string;
}

export class OrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() orderId: string;
  @ApiProperty() skuId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() quantity: string;
  @ApiPropertyOptional() reservationId?: string;
  @ApiPropertyOptional({ type: OrderItemReservationResponseDto })
  reservation?: OrderItemReservationResponseDto | null;
  @ApiPropertyOptional({ type: OrderItemSkuResponseDto })
  sku?: OrderItemSkuResponseDto;
  @ApiPropertyOptional({ type: OrderItemWarehouseResponseDto })
  warehouse?: OrderItemWarehouseResponseDto;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class OrderShippingSummaryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() orderId: string;
  @ApiProperty({ enum: ChannelProvider }) provider: ChannelProvider;
  @ApiProperty() externalOrderId: string;
  @ApiPropertyOptional() externalShipmentId?: string;
  @ApiPropertyOptional() status?: string;
  @ApiPropertyOptional() substatus?: string;
  @ApiPropertyOptional() shippingMode?: string;
  @ApiPropertyOptional() logisticType?: string;
  @ApiPropertyOptional() handlingEstimateAt?: Date;
  @ApiPropertyOptional() deliveryEstimateAt?: Date;
  @ApiPropertyOptional() postedAt?: Date;
  @ApiPropertyOptional() trackingCodeMasked?: string;
  @ApiProperty() source: string;
  @ApiProperty() confidence: number;
  @ApiProperty() lastSyncedAt: Date;
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
  @ApiProperty({ type: [OrderShippingSummaryResponseDto] })
  shippingSummaries: OrderShippingSummaryResponseDto[];
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
