import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChannelIntegrationStatus,
  ChannelInventorySyncStatus,
  ChannelCircuitState,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookStatus,
} from '@prisma/client';

export class ChannelIntegrationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty({ enum: ChannelProvider }) provider: ChannelProvider;
  @ApiProperty() name: string;
  @ApiPropertyOptional() externalAccountId?: string;
  @ApiPropertyOptional() externalStoreId?: string;
  @ApiPropertyOptional() displayName?: string;
  @ApiProperty({ enum: ChannelIntegrationStatus }) status: ChannelIntegrationStatus;
  @ApiPropertyOptional() defaultWarehouseId?: string;
  @ApiPropertyOptional() settings?: Record<string, unknown>;
  @ApiPropertyOptional() healthStatus?: string;
  @ApiProperty() requiresReauth: boolean;
  @ApiPropertyOptional() lastSuccessfulOperationAt?: Date;
  @ApiPropertyOptional() lastFailureAt?: Date;
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

export class ChannelInventorySyncStateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() listingId: string;
  @ApiProperty() integrationId: string;
  @ApiProperty({ enum: ChannelProvider }) provider: ChannelProvider;
  @ApiProperty() externalListingId: string;
  @ApiProperty() skuId: string;
  @ApiProperty({ enum: ChannelInventorySyncStatus }) status: ChannelInventorySyncStatus;
  @ApiProperty({ enum: ChannelCircuitState }) circuitState: ChannelCircuitState;
  @ApiProperty() targetAvailableQuantity: string;
  @ApiPropertyOptional() lastSyncedQuantity?: string;
  @ApiProperty() attemptCount: number;
  @ApiPropertyOptional() nextAttemptAt?: Date;
  @ApiPropertyOptional() circuitOpenedUntil?: Date;
  @ApiPropertyOptional() lastErrorCode?: string;
  @ApiPropertyOptional() lastErrorSummary?: string;
  @ApiProperty() lastRequestedAt: Date;
  @ApiPropertyOptional() lastSyncedAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ChannelInventorySyncProcessSummaryDto {
  @ApiProperty() processed: number;
  @ApiProperty() synced: number;
  @ApiProperty() retryScheduled: number;
  @ApiProperty() circuitOpened: number;
}

export class ChannelHealthSummaryDto {
  @ApiProperty() integrations: number;
  @ApiProperty() failedInbox: number;
  @ApiProperty() pendingInbox: number;
  @ApiProperty() failedInventorySync: number;
  @ApiProperty() circuitOpenInventorySync: number;
  @ApiProperty() retryScheduledInventorySync: number;
}

export class ChannelHealthIntegrationDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ChannelProvider }) provider: ChannelProvider;
  @ApiProperty({ enum: ChannelIntegrationStatus }) status: ChannelIntegrationStatus;
  @ApiPropertyOptional() healthStatus?: string;
  @ApiPropertyOptional() lastSuccessfulOperationAt?: Date;
  @ApiPropertyOptional() lastFailureAt?: Date;
}

export class ChannelHealthResponseDto {
  @ApiProperty({ enum: ['HEALTHY', 'DEGRADED', 'DOWN'] })
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';

  @ApiProperty({ type: ChannelHealthSummaryDto })
  summary: ChannelHealthSummaryDto;

  @ApiProperty({ type: [ChannelHealthIntegrationDto] })
  integrations: ChannelHealthIntegrationDto[];
}

export class ChannelReplayResponseDto {
  @ApiProperty() replayed: boolean;
  @ApiPropertyOptional() inboxEventId?: string;
  @ApiPropertyOptional() syncStateId?: string;
}

export class ChannelBulkReplayItemDto {
  @ApiProperty() inboxEventId: string;
  @ApiProperty() replayed: boolean;
  @ApiPropertyOptional() reason?: string;
}

export class ChannelBulkReplayResponseDto {
  @ApiProperty() requested: number;
  @ApiProperty() replayed: number;
  @ApiProperty() skipped: number;
  @ApiProperty({ type: [ChannelBulkReplayItemDto] })
  results: ChannelBulkReplayItemDto[];
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

export class PaginatedChannelInventorySyncResponseDto {
  @ApiProperty({ type: [ChannelInventorySyncStateResponseDto] })
  data: ChannelInventorySyncStateResponseDto[];

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
