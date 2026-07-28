import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export type InventoryValuationGroupBy = 'SKU' | 'PRODUCT' | 'CATEGORY' | 'BRAND' | 'WAREHOUSE';

export class ListInventoryValuationQueryDto {
  @ApiPropertyOptional({
    enum: ['SKU', 'PRODUCT', 'CATEGORY', 'BRAND', 'WAREHOUSE'],
    default: 'SKU',
  })
  @IsOptional()
  @IsIn(['SKU', 'PRODUCT', 'CATEGORY', 'BRAND', 'WAREHOUSE'])
  groupBy?: InventoryValuationGroupBy = 'SKU';

  @ApiPropertyOptional({ example: 'warehouse-id' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ example: 'CHAVEIRO' })
  @IsOptional()
  @IsString()
  search?: string;
}
