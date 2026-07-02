import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryMovementType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordAdjustmentDto {
  @ApiProperty({ example: 'sku-id' })
  @IsString()
  skuId: string;

  @ApiProperty({ example: 'warehouse-id' })
  @IsString()
  warehouseId: string;

  @ApiProperty({
    enum: [InventoryMovementType.ADJUSTMENT_IN, InventoryMovementType.ADJUSTMENT_OUT],
    example: InventoryMovementType.ADJUSTMENT_IN,
  })
  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @ApiProperty({ example: 5, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  quantity: number;

  @ApiProperty({ example: 'INITIAL_COUNT' })
  @IsString()
  reasonCode: string;

  @ApiPropertyOptional({ example: 'Contagem inicial do estoque físico' })
  @IsOptional()
  @IsString()
  notes?: string;
}
