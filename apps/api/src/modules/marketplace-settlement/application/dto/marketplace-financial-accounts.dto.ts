import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  CashLedgerEntryType,
  CashPositionAdjustmentType,
  GatewayEnvironment,
  OperationalFinancialAccountStatus,
  PaymentProvider,
} from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateMarketplaceFinancialAccountDto {
  @ApiProperty({
    enum: PaymentProvider,
    example: PaymentProvider.MERCADO_PAGO,
    description: '9B-1 supports Mercado Pago operational accounts only.',
  })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({
    description: 'Mercado Pago gateway connection that is settlement-ready.',
  })
  @IsUUID()
  gatewayConfigurationId: string;

  @ApiProperty({ example: 'Mercado Pago Principal' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 80)
  name: string;

  @ApiPropertyOptional({ example: 'BRL', default: 'BRL' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({
    example: 125000,
    description: 'Opening balance in minor units. For BRL, 125000 = R$ 1.250,00.',
  })
  @IsInt()
  @Min(-999999999999)
  @Max(999999999999)
  openingBalanceMinor: number;

  @ApiProperty({ example: 'initial_import' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 80)
  reasonCode: string;

  @ApiPropertyOptional({ example: 'Initial balance checked against Mercado Pago statement.' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class CreateCashPositionAdjustmentDto {
  @ApiProperty({
    example: 2500,
    description: 'Adjustment amount in minor units. Positive credits cash; negative debits cash.',
  })
  @IsInt()
  @Min(-999999999999)
  @Max(999999999999)
  amountMinor: number;

  @ApiProperty({ example: 'manual_correction' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 80)
  reasonCode: string;

  @ApiProperty({ example: 'Correction after statement review.' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 500)
  notes: string;
}

export class ListCashLedgerEntriesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;
}

export class CashLedgerEntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CashLedgerEntryType })
  type: CashLedgerEntryType;

  @ApiProperty()
  amountMinor: string;

  @ApiProperty()
  balanceAfterMinor: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  reasonCode: string;

  @ApiProperty({ required: false })
  notes?: string | null;

  @ApiProperty()
  occurredAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class MarketplaceFinancialAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ enum: GatewayEnvironment })
  environment: GatewayEnvironment;

  @ApiProperty()
  gatewayConfigurationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: OperationalFinancialAccountStatus })
  status: OperationalFinancialAccountStatus;

  @ApiProperty()
  openingBalanceMinor: string;

  @ApiProperty()
  currentBalanceMinor: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MarketplaceFinancialAccountsResponseDto {
  @ApiProperty({ type: () => [MarketplaceFinancialAccountResponseDto] })
  data: MarketplaceFinancialAccountResponseDto[];
}

export class MarketplaceFinancialAccountMutationResponseDto {
  @ApiProperty({ type: () => MarketplaceFinancialAccountResponseDto })
  account: MarketplaceFinancialAccountResponseDto;

  @ApiProperty({ type: () => CashLedgerEntryResponseDto })
  ledgerEntry: CashLedgerEntryResponseDto;
}

export class CashPositionAdjustmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CashPositionAdjustmentType })
  type: CashPositionAdjustmentType;

  @ApiProperty()
  amountMinor: string;

  @ApiProperty()
  reasonCode: string;

  @ApiProperty()
  notes: string | null;

  @ApiProperty({ type: () => CashLedgerEntryResponseDto })
  ledgerEntry: CashLedgerEntryResponseDto;
}

export class CashLedgerEntriesResponseDto {
  @ApiProperty({ type: () => [CashLedgerEntryResponseDto] })
  data: CashLedgerEntryResponseDto[];

  @ApiProperty()
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
