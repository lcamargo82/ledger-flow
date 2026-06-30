import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import {
  GatewayEnvironment,
  PaymentProvider,
  GatewayConfigurationStatus,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlatformGatewayConnectionStatusDto {
  @ApiProperty({
    enum: GatewayConfigurationStatus,
    example: GatewayConfigurationStatus.INACTIVE,
  })
  @IsEnum(GatewayConfigurationStatus)
  status: GatewayConfigurationStatus;

  @ApiProperty({
    example: 'Gateway suspenso temporariamente para investigação operacional.',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class PlatformGatewayConnectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ enum: GatewayEnvironment })
  environment: GatewayEnvironment;

  @ApiProperty({ enum: GatewayConfigurationStatus })
  status: GatewayConfigurationStatus;

  @ApiProperty()
  healthStatus: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  lastFailureAt?: Date | null;

  @ApiProperty({ required: false })
  lastSuccessfulOperationAt?: Date | null;
}
