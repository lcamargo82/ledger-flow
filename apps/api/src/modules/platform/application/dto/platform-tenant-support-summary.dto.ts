import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformTenantSupportTenantDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  active: boolean;
}

export class PlatformTenantSupportSubscriptionDto {
  @ApiPropertyOptional()
  plan?: string;

  @ApiPropertyOptional()
  status?: string;
}

export class PlatformTenantSupportDetailsDto {
  @ApiProperty()
  healthStatus: string;

  @ApiProperty()
  recentWarnings: number;

  @ApiProperty()
  recentCriticalEvents: number;

  @ApiProperty()
  recentWebhookFailures: number;

  @ApiPropertyOptional()
  lastSuccessfulWebhookAt?: Date;

  @ApiPropertyOptional()
  lastPaymentStatusChangeAt?: Date;

  @ApiPropertyOptional()
  lastOwnerLoginAt?: Date;

  @ApiProperty()
  pendingInvitation: boolean;

  @ApiProperty({ type: [String] })
  activeGatewayProviders: string[];
}

export class PlatformTenantSupportSummaryDto {
  @ApiProperty({ type: () => PlatformTenantSupportTenantDto })
  tenant: PlatformTenantSupportTenantDto;

  @ApiProperty({ type: () => PlatformTenantSupportSubscriptionDto })
  subscription: PlatformTenantSupportSubscriptionDto;

  @ApiProperty({ type: () => PlatformTenantSupportDetailsDto })
  support: PlatformTenantSupportDetailsDto;

  @ApiProperty({ type: [String] })
  recommendedActions: string[];
}
