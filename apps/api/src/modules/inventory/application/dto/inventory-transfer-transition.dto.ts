import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CompleteInventoryTransferDto {
  @ApiProperty({ example: 'complete-transfer-123' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

export class CancelInventoryTransferDto {
  @ApiProperty({ example: 'OTHER' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiPropertyOptional({ example: 'Transferencia cancelada pela operacao' })
  @IsOptional()
  @IsString()
  notes?: string;
}
