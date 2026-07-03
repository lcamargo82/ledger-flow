import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReconciliationCaseStatus,
  ReconciliationMatchType,
  WebhookProvider,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ListReconciliationCasesQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;

  @ApiPropertyOptional({ enum: ReconciliationCaseStatus })
  @IsOptional()
  @IsEnum(ReconciliationCaseStatus)
  status?: ReconciliationCaseStatus;

  @ApiPropertyOptional({ enum: WebhookProvider })
  @IsOptional()
  @IsEnum(WebhookProvider)
  provider?: WebhookProvider;

  @ApiPropertyOptional({ enum: ReconciliationMatchType })
  @IsOptional()
  @IsEnum(ReconciliationMatchType)
  matchType?: ReconciliationMatchType;

  @ApiPropertyOptional({ description: 'Data inicial (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data final (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
