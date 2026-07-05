import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelProvider } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateChannelIntegrationDto {
  @ApiProperty({ enum: ChannelProvider, example: ChannelProvider.MOCK })
  @IsEnum(ChannelProvider)
  provider: ChannelProvider;

  @ApiProperty({ example: 'Mock store' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'seller-123' })
  @IsOptional()
  @IsString()
  externalAccountId?: string;

  @ApiPropertyOptional({ example: 'store-123' })
  @IsOptional()
  @IsString()
  externalStoreId?: string;

  @ApiPropertyOptional({ example: 'Mercado Livre Principal' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'warehouse-uuid' })
  @IsOptional()
  @IsString()
  defaultWarehouseId?: string;

  @ApiPropertyOptional({ example: { importListingsEnabled: true } })
  @IsOptional()
  @IsObject()
  settingsJson?: Record<string, unknown>;

  @ApiPropertyOptional({ example: { stockSyncEnabled: false, maxPagesPerRun: 2 } })
  @IsOptional()
  @IsObject()
  syncPolicyJson?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'local-secret-token', minLength: 12 })
  @IsOptional()
  @IsString()
  @MinLength(12)
  webhookSecret?: string;
}
