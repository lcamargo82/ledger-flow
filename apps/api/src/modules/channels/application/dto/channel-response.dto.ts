import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChannelIntegrationStatus,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookStatus,
} from '@prisma/client';

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

export class ChannelListingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() integrationId: string;
  @ApiProperty({ enum: ChannelProvider }) provider: ChannelProvider;
  @ApiProperty() externalListingId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() externalSku?: string;
  @ApiProperty({ enum: ChannelListingMatchStatus }) matchStatus: ChannelListingMatchStatus;
  @ApiPropertyOptional() matchedSkuId?: string;
  @ApiPropertyOptional({ type: [String] }) candidateSkuIds?: string[];
  @ApiProperty() importedAt: Date;
  @ApiPropertyOptional() ignoredAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ChannelListingsImportSummaryDto {
  @ApiProperty() imported: number;
  @ApiProperty() matched: number;
  @ApiProperty() unmatched: number;
  @ApiProperty() ambiguous: number;
  @ApiProperty() ignored: number;
}

export class ChannelListingsImportResponseDto {
  @ApiProperty({ type: ChannelListingsImportSummaryDto })
  summary: ChannelListingsImportSummaryDto;

  @ApiProperty({ type: [ChannelListingResponseDto] })
  data: ChannelListingResponseDto[];
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

export class PaginatedChannelListingsResponseDto {
  @ApiProperty({ type: [ChannelListingResponseDto] })
  data: ChannelListingResponseDto[];

  @ApiProperty({ type: ChannelInboxMetaDto })
  meta: ChannelInboxMetaDto;
}

export class ChannelListingMutationResponseDto {
  @ApiProperty({ type: ChannelListingResponseDto })
  listing: ChannelListingResponseDto;
}

export class PaginatedChannelInboxResponseDto {
  @ApiProperty({ type: [ChannelWebhookInboxResponseDto] })
  data: ChannelWebhookInboxResponseDto[];

  @ApiProperty({ type: ChannelInboxMetaDto })
  meta: ChannelInboxMetaDto;
}
