import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SalesIntelligenceNetAmountSource,
  SalesIntelligenceStockStatus,
} from '../../domain/enums/sales-intelligence.enums';

export class SalesIntelligenceItemDto {
  @ApiProperty() orderItemId: string;
  @ApiProperty() skuId: string;
  @ApiPropertyOptional() sku?: string | null;
  @ApiPropertyOptional() productName?: string | null;
  @ApiProperty({ description: 'Decimal quantity serialized as a string' }) quantity: string;
  @ApiProperty({ enum: SalesIntelligenceStockStatus })
  stockStatus: SalesIntelligenceStockStatus;
}

export class SalesIntelligenceRowDto {
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiPropertyOptional() externalOrderId?: string | null;
  @ApiProperty() soldAt: Date;
  @ApiProperty() orderStatus: string;
  @ApiProperty({ type: [SalesIntelligenceItemDto] }) items: SalesIntelligenceItemDto[];
  @ApiPropertyOptional() paymentStatus?: string | null;
  @ApiPropertyOptional({ description: 'Minor units serialized as a string' })
  paidAmountMinor?: string | null;
  @ApiPropertyOptional({ description: 'Minor units serialized as a string' })
  feeAmountMinor?: string | null;
  @ApiPropertyOptional({ description: 'Minor units serialized as a string' })
  netAmountMinor?: string | null;
  @ApiProperty({ enum: SalesIntelligenceNetAmountSource })
  netAmountSource: SalesIntelligenceNetAmountSource;
  @ApiProperty({ enum: SalesIntelligenceStockStatus })
  stockStatus: SalesIntelligenceStockStatus;
  @ApiProperty() currency: string;
}

export class SalesIntelligenceMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() perPage: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedSalesIntelligenceResponseDto {
  @ApiProperty({ type: [SalesIntelligenceRowDto] }) data: SalesIntelligenceRowDto[];
  @ApiProperty({ type: SalesIntelligenceMetaDto }) meta: SalesIntelligenceMetaDto;
}

export class SalesIntelligenceSummaryDto {
  @ApiProperty() orderCount: number;
  @ApiProperty() paidAmountMinor: string;
  @ApiProperty() feeAmountMinor: string;
  @ApiProperty() netAmountMinor: string;
  @ApiProperty() realizedNetAmountMinor: string;
  @ApiProperty() reconciledNetAmountMinor: string;
  @ApiProperty() estimatedNetAmountMinor: string;
  @ApiProperty() stockIssueCount: number;
  @ApiProperty() currency: string;
}

export class SalesIntelligenceDetailItemDto {
  @ApiProperty() orderItemId: string;
  @ApiProperty() skuId: string;
  @ApiPropertyOptional() sku?: string | null;
  @ApiPropertyOptional() productName?: string | null;
  @ApiProperty() quantity: string;
  @ApiPropertyOptional({ enum: SalesIntelligenceStockStatus })
  stockStatus?: SalesIntelligenceStockStatus | null;
  @ApiPropertyOptional() warehouseName?: string | null;
  @ApiPropertyOptional() warehouseCode?: string | null;
  @ApiPropertyOptional({ description: 'Minor units; redacted without profitability permission' })
  unitCostMinor?: string | null;
  @ApiPropertyOptional({ description: 'Minor units; redacted without profitability permission' })
  cogsAmountMinor?: string | null;
}

export class SalesIntelligenceDetailDto {
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiPropertyOptional() externalOrderId?: string | null;
  @ApiProperty() soldAt: Date;
  @ApiProperty() orderStatus: string;
  @ApiProperty({ type: [SalesIntelligenceDetailItemDto] })
  items: SalesIntelligenceDetailItemDto[];
  @ApiProperty({
    description: 'Backend-evaluated field visibility. The client cannot elevate these flags.',
    example: {
      canViewProfitability: true,
      canViewSettlement: true,
      canViewPayment: true,
      canViewInventory: true,
    },
  })
  permissions: Record<string, boolean>;
  @ApiProperty({ description: 'Minor-unit financial values with protected profitability fields' })
  financial: Record<string, unknown>;
  @ApiProperty({ description: 'Sanitized Mercado Livre shipping summary' })
  shipping: Record<string, unknown>;
  @ApiPropertyOptional({ description: 'Redacted without settlement permission' })
  settlement?: Record<string, unknown> | null;
  @ApiPropertyOptional({ description: 'Redacted without payment permission' })
  payment?: Record<string, unknown> | null;
}

export class SalesTimelineEventDto {
  @ApiProperty() id: string;
  @ApiProperty() occurredAt: Date;
  @ApiProperty({
    enum: [
      'ORDER',
      'PAYMENT',
      'INVENTORY',
      'SHIPPING',
      'SETTLEMENT',
      'NOTIFICATION',
      'OUTBOUND_WEBHOOK',
      'SYSTEM',
    ],
  })
  source: string;
  @ApiProperty() type: string;
  @ApiProperty() titleKey: string;
  @ApiProperty() messageKey: string;
  @ApiProperty({ enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'] }) severity: string;
  @ApiProperty({ description: 'Allow-listed sanitized metadata only' })
  metadata: Record<string, unknown>;
}
