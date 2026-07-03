import { ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class ListReconciliationPoliciesQueryDto {
  @ApiPropertyOptional({ enum: WebhookProvider })
  @IsOptional()
  @IsEnum(WebhookProvider)
  provider?: WebhookProvider;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
