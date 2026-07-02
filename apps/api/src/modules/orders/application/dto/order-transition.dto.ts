import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OrderTransitionDto {
  @ApiProperty({ example: 'ORDER_CONFIRMED' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiProperty({ example: 'confirm-order-id' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiPropertyOptional({ example: 'Transição operacional do pedido interno' })
  @IsOptional()
  @IsString()
  notes?: string;
}
