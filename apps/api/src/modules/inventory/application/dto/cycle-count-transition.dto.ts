import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CountCycleCountItemDto {
  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(0)
  countedQuantity: number;
}

export class ApproveCycleCountDto {
  @ApiProperty({ example: 'DISCREPANCY_RECOUNT' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiProperty({ example: 'approve-cycle-count-123' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiPropertyOptional({ example: 'Aprovado após validação operacional' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelCycleCountDto {
  @ApiProperty({ example: 'OTHER' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiPropertyOptional({ example: 'Contagem cancelada pela operação' })
  @IsOptional()
  @IsString()
  notes?: string;
}
