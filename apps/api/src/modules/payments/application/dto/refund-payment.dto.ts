import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundPaymentDto {
  @ApiPropertyOptional({
    description: 'Motivo do reembolso',
    maxLength: 500,
    example: 'Cliente solicitou devolução por arrependimento',
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
