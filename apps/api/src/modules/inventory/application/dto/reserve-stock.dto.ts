import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ReserveStockDto {
  @ApiProperty({ example: 'sku-id' })
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @ApiProperty({ example: 'warehouse-id' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'ADMIN_HOLD' })
  @IsString()
  @IsNotEmpty()
  sourceType: string;

  @ApiProperty({ example: 'hold-123' })
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @ApiProperty({ example: 'reserve-hold-123' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ example: 'ALLOCATE' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiPropertyOptional({ example: 'Reserva administrativa para validação operacional' })
  @IsOptional()
  @IsString()
  notes?: string;
}
