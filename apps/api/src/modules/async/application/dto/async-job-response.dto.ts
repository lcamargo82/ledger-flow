import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AsyncJobResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiProperty()
  eventType: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  publishAttempts: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  traceId?: string;

  @ApiPropertyOptional()
  lastErrorSummary?: string;
}
