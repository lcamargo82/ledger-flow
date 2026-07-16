import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChannelIntegration,
  ChannelIntegrationStatus,
  ChannelListing,
  ChannelListingMatchStatus,
  ChannelProvider,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { GatewayCredentialsEncryptionService } from '../../../gateways/application/services/gateway-credentials-encryption.service';
import { CreateChannelIntegrationDto } from '../dto/create-channel-integration.dto';
import { ListChannelInboxQueryDto } from '../dto/list-channel-inbox-query.dto';
import {
  ImportChannelListingsDto,
  MockChannelListingDto,
} from '../dto/import-channel-listings.dto';
import { ListChannelListingsQueryDto } from '../dto/list-channel-listings-query.dto';
import { MapChannelListingDto } from '../dto/map-channel-listing.dto';
import { UpdateChannelIntegrationSettingsDto } from '../dto/update-channel-integration-settings.dto';
import { CHANNELS_REPOSITORY } from '../../domain/repositories/channels.repository';
import type { ChannelsRepository } from '../../domain/repositories/channels.repository';
import { MercadoLivreChannelAdapter } from '../../infra/adapters/mercado-livre-channel.adapter';
import { MercadoLivreCredentialsService } from './mercado-livre-credentials.service';

@Injectable()
export class ChannelsService {
  constructor(
    @Inject(CHANNELS_REPOSITORY)
    private readonly channelsRepository: ChannelsRepository,
    private readonly prisma: PrismaService,
    private readonly mercadoLivreAdapter?: MercadoLivreChannelAdapter,
    private readonly credentialsEncryptionService?: GatewayCredentialsEncryptionService,
    private readonly mercadoLivreCredentialsService?: MercadoLivreCredentialsService,
  ) {}

  async createIntegration(tenantId: string, actorUserId: string, dto: CreateChannelIntegrationDto) {
    this.assertSafePanelConfiguration(dto.settingsJson);
    this.assertSafePanelConfiguration(dto.syncPolicyJson);

    const integration = await this.channelsRepository.createIntegration({
      tenantId,
      provider: dto.provider,
      name: dto.name,
      externalAccountId: dto.externalAccountId,
      externalStoreId: dto.externalStoreId,
      displayName: dto.displayName,
      defaultWarehouseId: dto.defaultWarehouseId,
      settingsJson: dto.settingsJson as Prisma.InputJsonValue,
      syncPolicyJson: dto.syncPolicyJson as Prisma.InputJsonValue,
      status:
        dto.provider === ChannelProvider.MOCK
          ? ChannelIntegrationStatus.ACTIVE
          : ChannelIntegrationStatus.INACTIVE,
      webhookSecretHash: dto.webhookSecret ? this.hash(dto.webhookSecret) : null,
      createdByUserId: actorUserId,
    });

    await this.audit(tenantId, actorUserId, 'channels.integration.created', integration.id, {
      provider: dto.provider,
      name: dto.name,
      externalAccountId: dto.externalAccountId,
      externalStoreId: dto.externalStoreId,
      displayName: dto.displayName,
      hasSettings: Boolean(dto.settingsJson),
      hasSyncPolicy: Boolean(dto.syncPolicyJson),
    });

    return integration;
  }

  async listIntegrations(tenantId: string) {
    const integrations = await this.channelsRepository.listIntegrations(tenantId);
    return integrations.map((integration) => this.toOperationalIntegration(integration));
  }

  async getIntegration(id: string, tenantId: string) {
    const integration = await this.requireIntegration(id, tenantId);
    return this.toOperationalIntegration(integration);
  }

  async updateIntegrationSettings(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: UpdateChannelIntegrationSettingsDto,
  ) {
    const integration = await this.requireIntegration(id, tenantId);
    if (dto.defaultWarehouseId) {
      const warehouse = await this.channelsRepository.findWarehouseById(
        dto.defaultWarehouseId,
        tenantId,
      );
      if (!warehouse?.isActive) {
        throw new BadRequestException('Active warehouse from the same tenant is required.');
      }
    }

    const currentSettings = this.asRecord(integration.settingsJson);
    const settingsJson = {
      ...currentSettings,
      syncEnabled: dto.syncEnabled ?? this.asBoolean(currentSettings.syncEnabled, true),
      stockSyncMode: dto.stockSyncMode ?? this.asString(currentSettings.stockSyncMode, 'AVAILABLE'),
      importListingsOnConnect:
        dto.importListingsOnConnect ??
        this.asBoolean(currentSettings.importListingsOnConnect, false),
      mercadoLivreWarehouseStoreId:
        dto.mercadoLivreWarehouseStoreId !== undefined
          ? dto.mercadoLivreWarehouseStoreId?.trim() || null
          : this.asNullableString(currentSettings.mercadoLivreWarehouseStoreId),
      mercadoLivreWarehouseNetworkNodeId:
        dto.mercadoLivreWarehouseNetworkNodeId !== undefined
          ? dto.mercadoLivreWarehouseNetworkNodeId?.trim() || null
          : this.asNullableString(currentSettings.mercadoLivreWarehouseNetworkNodeId),
    };
    const hasMercadoLivreStore = Boolean(settingsJson.mercadoLivreWarehouseStoreId);
    const hasMercadoLivreNode = Boolean(settingsJson.mercadoLivreWarehouseNetworkNodeId);
    if (hasMercadoLivreStore !== hasMercadoLivreNode) {
      throw new BadRequestException(
        'Mercado Livre store and network node identifiers must be configured together.',
      );
    }
    const resultingWarehouseId =
      dto.defaultWarehouseId !== undefined
        ? dto.defaultWarehouseId || null
        : integration.defaultWarehouseId;
    if (hasMercadoLivreStore && !resultingWarehouseId) {
      throw new BadRequestException(
        'A default warehouse is required for Mercado Livre multi-origin inventory sync.',
      );
    }
    const updated = await this.channelsRepository.updateIntegrationSettings(id, tenantId, {
      ...(dto.defaultWarehouseId !== undefined && {
        defaultWarehouseId: dto.defaultWarehouseId || null,
      }),
      settingsJson,
    });
    await this.audit(tenantId, actorUserId, 'channels.integration.settings_updated', id, {
      provider: integration.provider,
      defaultWarehouseId: updated.defaultWarehouseId,
      ...settingsJson,
    });
    return this.toOperationalIntegration(updated);
  }

  suspendIntegration(id: string, tenantId: string, actorUserId: string) {
    return this.transitionIntegration(
      id,
      tenantId,
      actorUserId,
      [ChannelIntegrationStatus.ACTIVE, ChannelIntegrationStatus.REAUTH_REQUIRED],
      ChannelIntegrationStatus.SUSPENDED,
    );
  }

  async reactivateIntegration(id: string, tenantId: string, actorUserId: string) {
    const integration = await this.requireIntegration(id, tenantId);
    if (
      integration.status !== ChannelIntegrationStatus.SUSPENDED ||
      !integration.encryptedCredentials
    ) {
      throw new BadRequestException('Only suspended integrations with credentials can reactivate.');
    }
    return this.transitionIntegration(
      id,
      tenantId,
      actorUserId,
      [ChannelIntegrationStatus.SUSPENDED],
      ChannelIntegrationStatus.ACTIVE,
      integration,
    );
  }

  async updateIntegrationStatus(
    id: string,
    tenantId: string,
    actorUserId: string,
    status: ChannelIntegrationStatus,
  ) {
    const integration = await this.channelsRepository.updateIntegrationStatus(id, tenantId, status);
    await this.audit(tenantId, actorUserId, 'channels.integration.status_updated', integration.id, {
      status,
    });
    return integration;
  }

  listInbox(tenantId: string, query: ListChannelInboxQueryDto) {
    return this.channelsRepository.listInbox({ tenantId, ...query });
  }

  listListings(tenantId: string, query: ListChannelListingsQueryDto) {
    return this.channelsRepository.listListings({ tenantId, ...query });
  }

  listSkuOptions(tenantId: string, query: { search?: string; limit?: number }) {
    return this.channelsRepository.listSkuOptions({
      tenantId,
      search: query.search,
      limit: query.limit ?? 50,
    });
  }

  async importListings(
    integrationId: string,
    tenantId: string,
    actorUserId: string,
    dto: ImportChannelListingsDto,
  ) {
    const integration = await this.channelsRepository.findIntegrationById(integrationId, tenantId);
    if (!integration) {
      throw new NotFoundException('Channel integration not found.');
    }
    if (integration.status !== ChannelIntegrationStatus.ACTIVE) {
      throw new BadRequestException('Only active channel integrations can import listings.');
    }
    const importedListings = await this.resolveImportListings(integration, dto);
    const data: ChannelListing[] = [];
    const summary = {
      imported: 0,
      matched: 0,
      unmatched: 0,
      ambiguous: 0,
      ignored: 0,
    };

    for (const listing of importedListings) {
      const existing = await this.channelsRepository.findListingByExternalId({
        tenantId,
        integrationId: integration.id,
        externalListingId: listing.externalListingId,
      });
      const decision =
        existing?.matchStatus === ChannelListingMatchStatus.MATCHED && existing.matchedSkuId
          ? {
              status: ChannelListingMatchStatus.MATCHED,
              matchedSkuId: existing.matchedSkuId,
              candidateSkuIds: [existing.matchedSkuId],
            }
          : await this.classifyListing(tenantId, listing);
      const saved = await this.channelsRepository.upsertListing({
        tenantId,
        integrationId: integration.id,
        provider: integration.provider,
        externalListingId: listing.externalListingId,
        externalUserProductId: listing.externalUserProductId?.trim() || null,
        title: listing.title,
        externalSku: listing.externalSku?.trim() || null,
        matchStatus: decision.status,
        matchedSkuId: decision.matchedSkuId,
        candidateSkuIds: decision.candidateSkuIds,
      });

      summary.imported += 1;
      if (decision.status === ChannelListingMatchStatus.MATCHED) summary.matched += 1;
      if (decision.status === ChannelListingMatchStatus.UNMATCHED) summary.unmatched += 1;
      if (decision.status === ChannelListingMatchStatus.AMBIGUOUS) summary.ambiguous += 1;
      if (decision.status === ChannelListingMatchStatus.IGNORED) summary.ignored += 1;
      data.push(saved);
    }

    await this.audit(
      tenantId,
      actorUserId,
      'channels.listings.imported',
      integration.id,
      {
        provider: integration.provider,
        summary,
      },
      'ChannelIntegration',
    );

    await this.createOutbox(tenantId, integration.id, 'channel.listing.import.completed', {
      integrationId: integration.id,
      provider: integration.provider,
      summary,
    });

    return { summary, data };
  }

  async mapListing(
    listingId: string,
    tenantId: string,
    actorUserId: string,
    dto: MapChannelListingDto,
  ) {
    const listing = await this.channelsRepository.findListingById(listingId, tenantId);
    if (!listing) {
      throw new NotFoundException('Channel listing not found.');
    }

    const sku = await this.channelsRepository.findSkuById(dto.skuId, tenantId);
    if (!sku) {
      throw new BadRequestException('SKU does not belong to this tenant.');
    }

    const mappedListing = await this.channelsRepository.createManualMappingGroup({
      tenantId,
      listingId,
      integrationId: listing.integrationId,
      externalUserProductId: listing.externalUserProductId,
      skuId: dto.skuId,
      actorUserId,
      reason: dto.reason,
    });

    await this.audit(
      tenantId,
      actorUserId,
      'channels.listing.mapped',
      mappedListing.id,
      {
        listingId,
        externalUserProductId: listing.externalUserProductId,
        skuId: dto.skuId,
        previousStatus: listing.matchStatus,
        reason: dto.reason,
      },
      'ChannelListing',
    );

    await this.createOutbox(tenantId, mappedListing.id, 'channel.listing.mapped', {
      listingId: mappedListing.id,
      skuId: dto.skuId,
    });

    return mappedListing;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async transitionIntegration(
    id: string,
    tenantId: string,
    actorUserId: string,
    allowedStatuses: ChannelIntegrationStatus[],
    nextStatus: ChannelIntegrationStatus,
    loadedIntegration?: ChannelIntegration,
  ) {
    const integration = loadedIntegration ?? (await this.requireIntegration(id, tenantId));
    if (!allowedStatuses.includes(integration.status)) {
      throw new BadRequestException('Channel integration status transition is not allowed.');
    }
    const updated = await this.channelsRepository.updateIntegrationStatus(id, tenantId, nextStatus);
    await this.audit(tenantId, actorUserId, 'channels.integration.status_updated', id, {
      provider: integration.provider,
      previousStatus: integration.status,
      status: nextStatus,
    });
    return this.toOperationalIntegration(updated);
  }

  private async requireIntegration(id: string, tenantId: string) {
    const integration = await this.channelsRepository.findIntegrationById(id, tenantId);
    if (!integration) throw new NotFoundException('Channel integration not found.');
    return integration;
  }

  private toOperationalIntegration(integration: ChannelIntegration) {
    const settings = this.asRecord(integration.settingsJson);
    return {
      id: integration.id,
      tenantId: integration.tenantId,
      provider: integration.provider,
      name: integration.name,
      externalAccountId: integration.externalAccountId,
      externalStoreId: integration.externalStoreId,
      displayName: integration.displayName,
      status: integration.status,
      defaultWarehouseId: integration.defaultWarehouseId,
      settings: {
        syncEnabled: this.asBoolean(settings.syncEnabled, true),
        stockSyncMode: this.asString(settings.stockSyncMode, 'AVAILABLE'),
        importListingsOnConnect: this.asBoolean(settings.importListingsOnConnect, false),
        mercadoLivreWarehouseStoreId: this.asNullableString(settings.mercadoLivreWarehouseStoreId),
        mercadoLivreWarehouseNetworkNodeId: this.asNullableString(
          settings.mercadoLivreWarehouseNetworkNodeId,
        ),
      },
      healthStatus: this.integrationHealth(integration),
      requiresReauth: integration.status === ChannelIntegrationStatus.REAUTH_REQUIRED,
      lastSuccessfulOperationAt: integration.lastSuccessfulOperationAt,
      lastFailureAt: integration.lastFailureAt,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  private integrationHealth(integration: ChannelIntegration) {
    if (integration.status === ChannelIntegrationStatus.REAUTH_REQUIRED) return 'REAUTH_REQUIRED';
    if (integration.status === ChannelIntegrationStatus.SUSPENDED) return 'SUSPENDED';
    if (
      integration.status === ChannelIntegrationStatus.DISABLED ||
      integration.status === ChannelIntegrationStatus.INACTIVE
    ) {
      return 'DISCONNECTED';
    }
    if (integration.lastFailureAt && !integration.lastSuccessfulOperationAt) return 'DEGRADED';
    return integration.healthStatus ?? 'HEALTHY';
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asBoolean(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
  }

  private asString(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private asNullableString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private assertSafePanelConfiguration(value: unknown) {
    if (!value || typeof value !== 'object') return;

    const forbiddenKeys = new Set([
      'accessToken',
      'apiKey',
      'authorization',
      'clientSecret',
      'code',
      'encryptedCredentials',
      'mercadoLivreAccessToken',
      'mercadoLivreRefreshToken',
      'refreshToken',
      'secret',
      'shopeeStoreToken',
      'shopifyAccessToken',
      'state',
      'token',
      'webhookSecret',
    ]);
    const stack = [value as Record<string, unknown>];

    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const [key, nested] of Object.entries(current)) {
        if (forbiddenKeys.has(key)) {
          throw new BadRequestException(
            'Channel panel settings cannot contain tenant scoped tokens or secrets.',
          );
        }
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          stack.push(nested as Record<string, unknown>);
        }
      }
    }
  }

  private async classifyListing(
    tenantId: string,
    listing: MockChannelListingDto,
  ): Promise<{
    status: ChannelListingMatchStatus;
    matchedSkuId: string | null;
    candidateSkuIds: string[];
  }> {
    const externalSku = listing.externalSku?.trim();
    if (!externalSku) {
      return {
        status: ChannelListingMatchStatus.UNMATCHED,
        matchedSkuId: null,
        candidateSkuIds: [],
      };
    }

    const candidates = await this.channelsRepository.findSkuMatchCandidates(tenantId, externalSku);
    if (candidates.length === 1) {
      return {
        status: ChannelListingMatchStatus.MATCHED,
        matchedSkuId: candidates[0].id,
        candidateSkuIds: [candidates[0].id],
      };
    }
    if (candidates.length > 1) {
      return {
        status: ChannelListingMatchStatus.AMBIGUOUS,
        matchedSkuId: null,
        candidateSkuIds: candidates.map((candidate) => candidate.id),
      };
    }

    return {
      status: ChannelListingMatchStatus.UNMATCHED,
      matchedSkuId: null,
      candidateSkuIds: [],
    };
  }

  private defaultMockListings(): MockChannelListingDto[] {
    return [
      {
        externalListingId: 'mock-listing-missing-sku',
        title: 'Mock Listing sem SKU externo',
      },
      {
        externalListingId: 'mock-listing-unknown-sku',
        title: 'Mock Listing com SKU não encontrado',
        externalSku: 'MOCK-SKU-INEXISTENTE',
      },
    ];
  }

  private async resolveImportListings(
    integration: ChannelIntegration,
    dto: ImportChannelListingsDto,
  ): Promise<MockChannelListingDto[]> {
    if (integration.provider === ChannelProvider.MOCK) {
      return dto.listings?.length ? dto.listings : this.defaultMockListings();
    }

    if (integration.provider !== ChannelProvider.MERCADO_LIVRE) {
      throw new BadRequestException('Unsupported channel provider for listing import.');
    }
    if (!this.mercadoLivreAdapter || !this.credentialsEncryptionService) {
      throw new BadRequestException('Mercado Livre listing import is not configured.');
    }
    if (!integration.encryptedCredentials || !integration.externalAccountId) {
      throw new BadRequestException('Mercado Livre integration requires encrypted credentials.');
    }

    const accessToken = this.mercadoLivreCredentialsService
      ? await this.mercadoLivreCredentialsService.getAccessToken(integration)
      : this.currentAccessToken(integration.encryptedCredentials);

    return this.mercadoLivreAdapter.fetchListings({
      accessToken,
      externalAccountId: integration.externalAccountId,
      maxPages: dto.maxPages,
      pageSize: dto.pageSize,
      ...(dto.externalUserProductId?.trim() && {
        externalUserProductId: dto.externalUserProductId.trim().toUpperCase(),
      }),
    });
  }

  private currentAccessToken(encryptedCredentials: unknown) {
    const credentials = this.credentialsEncryptionService!.decrypt(
      JSON.stringify(encryptedCredentials),
    );
    if (!credentials.accessToken) {
      throw new BadRequestException('Mercado Livre integration requires an access token.');
    }
    return credentials.accessToken;
  }

  private async createOutbox(
    tenantId: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'ChannelListing',
        aggregateId,
        eventType,
        eventVersion: 1,
        payload: payload as Prisma.InputJsonValue,
        payloadHash: this.hash(JSON.stringify(payload)),
      },
    });
  }

  private async audit(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    entityType = 'ChannelIntegration',
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType,
        entityId,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }
}
