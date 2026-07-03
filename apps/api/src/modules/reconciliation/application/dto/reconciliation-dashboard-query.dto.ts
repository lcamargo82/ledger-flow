import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReconciliationCaseStatus, WebhookProvider } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class ReconciliationDashboardQueryDto {
  @ApiPropertyOptional({ enum: WebhookProvider })
  @IsOptional()
  @IsEnum(WebhookProvider)
  provider?: WebhookProvider;

  @ApiPropertyOptional({ enum: ReconciliationCaseStatus })
  @IsOptional()
  @IsEnum(ReconciliationCaseStatus)
  status?: ReconciliationCaseStatus;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ description: 'Data inicial (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data final (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
