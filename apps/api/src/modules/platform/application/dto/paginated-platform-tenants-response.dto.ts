import { ApiProperty } from '@nestjs/swagger';
import { PlatformTenantResponseDto } from './platform-tenant-response.dto';

export class PaginatedPlatformTenantsResponseDto {
  @ApiProperty({ type: [PlatformTenantResponseDto] })
  data: PlatformTenantResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  perPage: number;
}
