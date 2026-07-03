import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { WebhookProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateReconciliationPolicyDto {
  @ApiPropertyOptional({ enum: WebhookProvider })
  @IsOptional()
  @IsEnum(WebhookProvider)
  provider?: WebhookProvider | null;

  @ApiProperty({ example: 'BRL' })
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;

  @ApiProperty({ minimum: 0, maximum: 9, default: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9)
  currencyExponent: number = 2;

  @ApiProperty({ example: '100', description: 'Minor units without decimal places.' })
  @IsString()
  @Matches(/^\d+$/)
  amountToleranceMinor: string;
}

export class UpdateReconciliationPolicyDto extends PartialType(
  CreateReconciliationPolicyDto,
) {}
