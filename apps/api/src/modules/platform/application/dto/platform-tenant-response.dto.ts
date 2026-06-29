import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TenantKind,
  SubscriptionPlan,
  TenantSubscriptionStatus,
} from '@prisma/client';

export class TenantSubscriptionShortDto {
  @ApiProperty({ enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ enum: TenantSubscriptionStatus })
  status: TenantSubscriptionStatus;
}

export class PlatformTenantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ enum: TenantKind })
  kind: TenantKind;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: TenantSubscriptionShortDto })
  subscription?: TenantSubscriptionShortDto;
}
