import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReservationTransitionDto {
  @ApiProperty({ example: 'FULFILLMENT' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiProperty({ example: 'consume-reservation-123' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiPropertyOptional({ example: 'Consumo operacional total da reserva' })
  @IsOptional()
  @IsString()
  notes?: string;
}
