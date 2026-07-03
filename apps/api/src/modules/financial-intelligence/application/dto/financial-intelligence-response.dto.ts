import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelProvider, InternalOrderStatus } from '@prisma/client';

export class OrderFinancialFactResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() orderId: string;
  @ApiProperty() version: number;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ enum: InternalOrderStatus }) orderStatus: InternalOrderStatus;
  @ApiPropertyOptional({ enum: ChannelProvider }) channelProvider?: ChannelProvider;
  @ApiProperty() revenueAmount: string;
  @ApiProperty() cogsAmount: string;
  @ApiProperty() channelFeeAmount: string;
  @ApiProperty() grossMarginAmount: string;
  @ApiProperty() currency: string;
  @ApiProperty() itemCount: number;
  @ApiPropertyOptional() fulfilledAt?: Date;
  @ApiProperty() calculatedAt: Date;
  @ApiProperty() components: Record<string, unknown>;
}

export class FinancialDashboardResponseDto {
  @ApiProperty() orderCount: number;
  @ApiProperty() revenueAmount: string;
  @ApiProperty() cogsAmount: string;
  @ApiProperty() grossMarginAmount: string;
  @ApiProperty() note: string;
}

export class FinancialFactsMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() perPage: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedOrderFinancialFactsResponseDto {
  @ApiProperty({ type: [OrderFinancialFactResponseDto] })
  data: OrderFinancialFactResponseDto[];

  @ApiProperty({ type: FinancialFactsMetaDto })
  meta: FinancialFactsMetaDto;
}
