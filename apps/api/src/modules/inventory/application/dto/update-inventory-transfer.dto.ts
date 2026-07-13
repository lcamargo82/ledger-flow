import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { InventoryTransferItemInputDto } from './create-inventory-transfer.dto';

export class UpdateInventoryTransferDto {
  @ApiPropertyOptional({ example: 'REBALANCING' })
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional({ example: 'Ajuste de rascunho antes do envio' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [InventoryTransferItemInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryTransferItemInputDto)
  items?: InventoryTransferItemInputDto[];
}
