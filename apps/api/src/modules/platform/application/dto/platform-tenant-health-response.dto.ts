import { ApiProperty } from '@nestjs/swagger';

export enum TenantHealthStatus {
  HEALTHY = 'HEALTHY',
  ATTENTION = 'ATTENTION',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

export class PlatformTenantHealthReasonDto {
  @ApiProperty() code: string;
  @ApiProperty() message: string;
}

export class PlatformTenantHealthResponseDto {
  @ApiProperty() tenantId: string;
  @ApiProperty({ enum: TenantHealthStatus }) status: TenantHealthStatus;
  @ApiProperty({ type: [PlatformTenantHealthReasonDto] })
  reasons: PlatformTenantHealthReasonDto[];
  @ApiProperty() evaluatedAt: string;
}
