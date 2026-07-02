import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelIntegrationStatus, ChannelProvider, ChannelWebhookStatus } from '@prisma/client';

export class ChannelIntegrationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty({ enum: ChannelProvider }) provider: ChannelProvider;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ChannelIntegrationStatus }) status: ChannelIntegrationStatus;
  @ApiPropertyOptional() createdByUserId?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ChannelWebhookInboxResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() integrationId: string;
  @ApiProperty({ enum: ChannelProvider }) provider: ChannelProvider;
  @ApiProperty() providerEventId: string;
  @ApiProperty() eventType: string;
  @ApiProperty({ enum: ChannelWebhookStatus }) status: ChannelWebhookStatus;
  @ApiProperty() payloadHash: string;
  @ApiPropertyOptional() payloadSummary?: Record<string, unknown>;
  @ApiProperty() receivedAt: Date;
  @ApiPropertyOptional() processedAt?: Date;
  @ApiPropertyOptional() failureReason?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ChannelWebhookAcceptedResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ChannelWebhookStatus }) status: ChannelWebhookStatus;
  @ApiPropertyOptional() duplicateOfId?: string;
}

export class ChannelIntegrationMutationResponseDto {
  @ApiProperty({ type: ChannelIntegrationResponseDto })
  integration: ChannelIntegrationResponseDto;
}

export class ChannelIntegrationsResponseDto {
  @ApiProperty({ type: [ChannelIntegrationResponseDto] })
  data: ChannelIntegrationResponseDto[];
}

export class ChannelInboxMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() perPage: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedChannelInboxResponseDto {
  @ApiProperty({ type: [ChannelWebhookInboxResponseDto] })
  data: ChannelWebhookInboxResponseDto[];

  @ApiProperty({ type: ChannelInboxMetaDto })
  meta: ChannelInboxMetaDto;
}
