import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class InventoryTransferItemInputDto {
  @ApiProperty({ example: 'sku-id' })
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateInventoryTransferDto {
  @ApiProperty({ example: 'source-warehouse-id' })
  @IsString()
  @IsNotEmpty()
  sourceWarehouseId: string;

  @ApiProperty({ example: 'destination-warehouse-id' })
  @IsString()
  @IsNotEmpty()
  destinationWarehouseId: string;

  @ApiProperty({ example: 'transfer-warehouse-a-to-b-123' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ example: 'REPLENISHMENT' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiPropertyOptional({ example: 'Reposicao operacional entre warehouses' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [InventoryTransferItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryTransferItemInputDto)
  items: InventoryTransferItemInputDto[];
}
