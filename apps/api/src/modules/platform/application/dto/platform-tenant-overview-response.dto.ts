import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformTenantOverviewOperationsDto {
  @ApiProperty() usersTotal: number;
  @ApiProperty() usersActive: number;
  @ApiProperty() customersTotal: number;
  @ApiProperty() customersActive: number;
  @ApiProperty() paymentsTotal: number;
  @ApiProperty() paymentsPending: number;
  @ApiProperty() paymentsProcessing: number;
  @ApiProperty() paymentsApproved: number;
  @ApiProperty() paymentsFailed: number;
  @ApiProperty() paymentsCanceled: number;
  @ApiProperty() paymentsRefunded: number;
}

export class PlatformTenantOverviewProviderDto {
  @ApiProperty() provider: string;
  @ApiProperty() environment: string;
  @ApiProperty() status: string;
  @ApiProperty() healthStatus: string;
  @ApiPropertyOptional() lastHealthCheckAt?: string;
}

export class PlatformTenantOverviewGatewayDto {
  @ApiProperty() hasActiveConfiguration: boolean;
  @ApiProperty({ type: [PlatformTenantOverviewProviderDto] }) activeProviders: PlatformTenantOverviewProviderDto[];
}

export class PlatformTenantOverviewWebhooksDto {
  @ApiPropertyOptional() lastReceivedAt?: string;
  @ApiProperty() processedLast24Hours: number;
  @ApiProperty() failedLast24Hours: number;
  @ApiProperty() ignoredLast24Hours: number;
}

export class PlatformTenantOverviewActivityDto {
  @ApiPropertyOptional() lastPaymentCreatedAt?: string;
  @ApiPropertyOptional() lastPaymentStatusChangeAt?: string;
  @ApiPropertyOptional() lastUserLoginAt?: string;
}

export class PlatformTenantOverviewTenantSubscriptionDto {
  @ApiProperty() plan: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() trialEndsAt?: string;
  @ApiPropertyOptional() currentPeriodEnd?: string;
}

export class PlatformTenantOverviewTenantDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() active: boolean;
  @ApiProperty() timezone: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() subscription: PlatformTenantOverviewTenantSubscriptionDto;
}

export class PlatformTenantOverviewResponseDto {
  @ApiProperty() tenant: PlatformTenantOverviewTenantDto;
  @ApiProperty() operations: PlatformTenantOverviewOperationsDto;
  @ApiProperty() gateway: PlatformTenantOverviewGatewayDto;
  @ApiProperty() webhooks: PlatformTenantOverviewWebhooksDto;
  @ApiProperty() activity: PlatformTenantOverviewActivityDto;
}
