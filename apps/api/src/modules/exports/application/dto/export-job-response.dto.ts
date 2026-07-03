import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportJobFormat, ExportJobStatus, ExportJobType } from '@prisma/client';

export class ExportJobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ExportJobType })
  type: ExportJobType;

  @ApiProperty({ enum: ExportJobFormat })
  format: ExportJobFormat;

  @ApiProperty({ enum: ExportJobStatus })
  status: ExportJobStatus;

  @ApiProperty()
  rowCount: number;

  @ApiPropertyOptional()
  fileName?: string | null;

  @ApiPropertyOptional()
  mimeType?: string | null;

  @ApiPropertyOptional()
  errorCode?: string | null;

  @ApiPropertyOptional()
  errorSummary?: string | null;

  @ApiPropertyOptional()
  expiresAt?: Date | null;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  cancelledAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedExportJobsResponseDto {
  @ApiProperty({ type: [ExportJobResponseDto] })
  data: ExportJobResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      perPage: 20,
      total: 1,
      totalPages: 1,
    },
  })
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
