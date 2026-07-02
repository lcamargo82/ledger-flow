import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductSkuInputDto } from './product-sku-input.dto';

export class CreateProductDto {
  @ApiProperty({ enum: ProductType, example: ProductType.SIMPLE })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiPropertyOptional({ example: 'parent-product-id' })
  @IsOptional()
  @IsString()
  parentProductId?: string;

  @ApiProperty({ example: 'Camiseta LedgerFlow' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Camiseta algodão premium' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'LedgerFlow' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Vestuário' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: { color: 'preto' } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ type: ProductSkuInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSkuInputDto)
  sku?: ProductSkuInputDto;
}
