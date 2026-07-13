import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CycleCountItemInputDto {
  @ApiProperty({ example: 'sku-id' })
  @IsString()
  @IsNotEmpty()
  skuId: string;
}

export class CreateCycleCountDto {
  @ApiProperty({ example: 'warehouse-id' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'cycle-count-warehouse-123' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ example: 'SCHEDULED_COUNT' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiPropertyOptional({ example: 'Contagem mensal do warehouse principal' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CycleCountItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CycleCountItemInputDto)
  items: CycleCountItemInputDto[];
}
