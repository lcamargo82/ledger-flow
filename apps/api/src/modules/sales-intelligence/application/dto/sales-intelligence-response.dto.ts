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
