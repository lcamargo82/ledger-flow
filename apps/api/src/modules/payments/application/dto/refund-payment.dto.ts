import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Motivo do reembolso',
    maxLength: 500,
    example: 'Cliente solicitou devolução por arrependimento',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
