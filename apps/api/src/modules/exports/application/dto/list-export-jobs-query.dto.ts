import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExportJobStatus, ExportJobType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListExportJobsQueryDto {
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

  @ApiPropertyOptional({ enum: ExportJobStatus })
  @IsOptional()
  @IsEnum(ExportJobStatus)
  status?: ExportJobStatus;

  @ApiPropertyOptional({ enum: ExportJobType })
  @IsOptional()
  @IsEnum(ExportJobType)
  type?: ExportJobType;
}
