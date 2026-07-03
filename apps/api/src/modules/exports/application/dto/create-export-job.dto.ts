import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportJobFormat, ExportJobType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional } from 'class-validator';

export class CreateExportJobDto {
  @ApiProperty({ enum: ExportJobType, example: ExportJobType.CATALOG_PRODUCTS })
  @IsEnum(ExportJobType)
  type: ExportJobType;

  @ApiProperty({ enum: ExportJobFormat, example: ExportJobFormat.CSV })
  @IsEnum(ExportJobFormat)
  format: ExportJobFormat;

  @ApiPropertyOptional({
    description: 'Filtros do relatorio. Mantidos pequenos e auditaveis.',
    example: { dateFrom: '2026-07-01T00:00:00.000Z' },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
