import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductSkuInputDto } from './product-sku-input.dto';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Camiseta LedgerFlow' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

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

  @ApiPropertyOptional({ example: 'Correção de custo informada pelo fornecedor' })
  @IsOptional()
  @IsString()
  costChangeReason?: string;
}
