import {
  IsString,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import {
  GatewayEnvironment,
  PaymentProvider,
  GatewayConfigurationStatus,
  PaymentMethod,
  GatewayHealthStatus,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAsaasGatewayConnectionDto {
  @ApiProperty({
    enum: GatewayEnvironment,
    example: GatewayEnvironment.SANDBOX,
  })
  @IsEnum(GatewayEnvironment)
  environment: GatewayEnvironment;

  @ApiProperty({ example: 'Minha API Key Asaas Sandbox' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({ example: 'Asaas Sandbox', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiProperty({
    enum: PaymentMethod,
    isArray: true,
    example: [PaymentMethod.PIX, PaymentMethod.BOLETO],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  supportedMethods?: PaymentMethod[];
}

export class UpdateGatewayConnectionDto {
  @ApiProperty({ example: 'Asaas Sandbox 2', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiProperty({
    enum: PaymentMethod,
    isArray: true,
    example: [PaymentMethod.PIX],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  supportedMethods?: PaymentMethod[];

  @ApiProperty({
    enum: GatewayConfigurationStatus,
    example: GatewayConfigurationStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(GatewayConfigurationStatus)
  status?: GatewayConfigurationStatus;
}

export class UpdateGatewayCredentialsDto {
  @ApiProperty({ example: 'Nova API Key' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

export class UpdateGatewayConnectionStatusDto {
  @ApiProperty({
    enum: GatewayConfigurationStatus,
    example: GatewayConfigurationStatus.ACTIVE,
  })
  @IsEnum(GatewayConfigurationStatus)
  status: GatewayConfigurationStatus;
}

export class GatewayFinancialReadinessDto {
  @ApiProperty({
    enum: [
      'UNSUPPORTED_PROVIDER',
      'NOT_CONFIGURED',
      'REAUTH_REQUIRED',
      'UNHEALTHY',
      'PAYMENT_ONLY',
      'SETTLEMENT_READY',
    ],
  })
  state:
    | 'UNSUPPORTED_PROVIDER'
    | 'NOT_CONFIGURED'
    | 'REAUTH_REQUIRED'
    | 'UNHEALTHY'
    | 'PAYMENT_ONLY'
    | 'SETTLEMENT_READY';

  @ApiProperty()
  canReadSettlements: boolean;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ enum: GatewayConfigurationStatus })
  connectionStatus: GatewayConfigurationStatus;

  @ApiProperty({ enum: GatewayHealthStatus })
  healthStatus: GatewayHealthStatus;

  @ApiProperty({ type: [String] })
  requiredScopes: string[];

  @ApiProperty({ type: [String] })
  grantedScopes: string[];

  @ApiProperty({ type: [String] })
  missingScopes: string[];

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  lastHealthCheckAt?: Date | null;

  @ApiProperty({ required: false })
  lastHealthCheckMessage?: string | null;

  @ApiProperty({ required: false })
  lastFinancialSyncAt?: Date | null;
}

export class GatewayConnectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ enum: GatewayEnvironment })
  environment: GatewayEnvironment;

  @ApiProperty({ enum: GatewayConfigurationStatus })
  status: GatewayConfigurationStatus;

  @ApiProperty()
  priority: number;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ enum: PaymentMethod, isArray: true })
  supportedMethods: PaymentMethod[];

  @ApiProperty()
  healthStatus: string;

  @ApiProperty({
    required: false,
    type: () => GatewayFinancialReadinessDto,
    description:
      'Derived financial-read readiness for providers that can later feed settlement flows.',
  })
  financialReadiness?: GatewayFinancialReadinessDto;

  @ApiProperty()
  credentialsConfigured: boolean;

  @ApiProperty({ required: false })
  lastFailureAt?: Date | null;

  @ApiProperty({ required: false })
  lastSuccessfulOperationAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
