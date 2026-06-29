import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformTenantResponseDto } from './platform-tenant-response.dto';
import { SubscriptionPlan, TenantSubscriptionStatus } from '@prisma/client';

export class TenantSubscriptionDetailsDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ enum: TenantSubscriptionStatus })
  status: TenantSubscriptionStatus;

  @ApiPropertyOptional()
  trialEndsAt?: Date;

  @ApiPropertyOptional()
  currentPeriodStart?: Date;

  @ApiPropertyOptional()
  currentPeriodEnd?: Date;

  @ApiPropertyOptional()
  externalSubscriptionReference?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TenantCountsDto {
  @ApiProperty()
  users: number;

  @ApiProperty()
  customers: number;

  @ApiProperty()
  payments: number;
}

export class PlatformTenantDetailsResponseDto extends PlatformTenantResponseDto {
  @ApiPropertyOptional({ type: TenantSubscriptionDetailsDto })
  subscriptionDetails?: TenantSubscriptionDetailsDto;

  @ApiProperty({ type: TenantCountsDto })
  counts: TenantCountsDto;
}
