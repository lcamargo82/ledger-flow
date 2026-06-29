import { ApiProperty } from '@nestjs/swagger';

export class PlatformTenantProvisionSubscriptionResponseDto {
  @ApiProperty()
  plan: string;

  @ApiProperty()
  status: string;
}

export class PlatformTenantProvisionOwnerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  invitationStatus: string;

  @ApiProperty()
  invitationExpiresAt: Date;
}

export class PlatformTenantProvisionDetailsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  kind: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  subscription: PlatformTenantProvisionSubscriptionResponseDto;

  @ApiProperty()
  owner: PlatformTenantProvisionOwnerResponseDto;
}

export class PlatformTenantProvisionResponseDto {
  @ApiProperty()
  tenant: PlatformTenantProvisionDetailsResponseDto;
}
