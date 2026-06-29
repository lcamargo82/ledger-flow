import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformTenantActivityItemDto {
  @ApiProperty() id: string;
  @ApiProperty() action: string;
  @ApiProperty() label: string;
  @ApiProperty() occurredAt: string;
  @ApiProperty() severity: 'INFO' | 'WARNING' | 'ERROR';
  @ApiPropertyOptional() actorType?: string;
  @ApiPropertyOptional() metadata?: any;
}

export class PlatformTenantActivityResponseDto {
  @ApiProperty({ type: [PlatformTenantActivityItemDto] }) items: PlatformTenantActivityItemDto[];
}
