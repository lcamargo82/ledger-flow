import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentExecutionMode } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'ID do cliente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Valor em centavos (ex: 12590 = R$ 125,90)',
    example: 12590,
  })
  @IsInt()
  @Min(1)
  @Max(99999999999)
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({
    description: 'Moeda no formato ISO 4217',
    example: 'BRL',
    default: 'BRL',
  })
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Método de pagamento',
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Modo de execução (EXTERNAL_GATEWAY, MANUAL, INTERNAL)',
    enum: PaymentExecutionMode,
    default: PaymentExecutionMode.EXTERNAL_GATEWAY,
  })
  @IsEnum(PaymentExecutionMode)
  @IsOptional()
  executionMode?: PaymentExecutionMode;

  @ApiPropertyOptional({
    description: 'Descrição opcional do pagamento',
    example: 'Pagamento de fatura mensal',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Data de vencimento do pagamento. Exigido para boletos.',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais em formato JSON.',
    example: { origin: 'website', campaign: 'black-friday' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
