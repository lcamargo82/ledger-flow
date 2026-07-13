import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SyncMarketplaceFinancialEventsDto {
  @ApiProperty({
    example: '2026-07-01T00:00:00.000Z',
    description: 'Inclusive period start used for Mercado Pago financial reads.',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    example: '2026-07-13T23:59:59.999Z',
    description: 'Inclusive period end used for Mercado Pago financial reads.',
  })
  @IsDateString()
  to: string;

  @ApiPropertyOptional({ default: 3, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxPages?: number = 3;
}

export class ListMarketplaceSettlementEventsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;
}

export class MarketplaceSettlementSyncResponseDto {
  @ApiProperty({ enum: WebhookProvider, example: WebhookProvider.MERCADO_PAGO })
  provider: WebhookProvider;

  @ApiProperty()
  pagesFetched: number;

  @ApiProperty()
  received: number;

  @ApiProperty()
  created: number;

  @ApiProperty()
  duplicates: number;

  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;
}

export class MarketplaceSettlementEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WebhookProvider })
  provider: WebhookProvider;

  @ApiProperty()
  providerEventId: string;

  @ApiProperty({ required: false })
  providerPaymentId?: string | null;

  @ApiProperty({ required: false })
  externalReference?: string | null;

  @ApiProperty()
  eventType: string;

  @ApiProperty({ required: false })
  providerStatus?: string | null;

  @ApiProperty({ required: false })
  amountMinor?: string | null;

  @ApiProperty({ required: false })
  feeAmountMinor?: string | null;

  @ApiProperty({ required: false })
  netAmountMinor?: string | null;

  @ApiProperty()
  currency: string;

  @ApiProperty({ required: false })
  occurredAt?: Date | null;

  @ApiProperty({ required: false })
  availableAt?: Date | null;

  @ApiProperty()
  receivedAt: Date;
}

export class MarketplaceSettlementEventsResponseDto {
  @ApiProperty({ type: () => [MarketplaceSettlementEventResponseDto] })
  data: MarketplaceSettlementEventResponseDto[];

  @ApiProperty()
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export class MarketplaceSettlementImportedTotalsDto {
  @ApiProperty()
  eventCount: number;

  @ApiProperty()
  grossAmountMinor: string;

  @ApiProperty()
  feeAmountMinor: string;

  @ApiProperty()
  netAmountMinor: string;

  @ApiProperty()
  currency: string;
}
