import { ApiProperty } from '@nestjs/swagger';
import { PlatformAuditLogResponseDto } from './platform-audit-log-response.dto';

export class PaginatedPlatformAuditLogResponseDto {
  @ApiProperty({ type: () => [PlatformAuditLogResponseDto] })
  data: PlatformAuditLogResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      perPage: 20,
      total: 100,
      totalPages: 5,
    },
  })
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
