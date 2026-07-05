import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
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
import { CHANNELS_REPOSITORY } from '../../domain/repositories/channels.repository';
import type { ChannelsRepository } from '../../domain/repositories/channels.repository';
import { MercadoLivreChannelAdapter } from '../../infra/adapters/mercado-livre-channel.adapter';

@Injectable()
export class ChannelsService {
  constructor(
    @Inject(CHANNELS_REPOSITORY)
    private readonly channelsRepository: ChannelsRepository,
    private readonly prisma: PrismaService,
    private readonly mercadoLivreAdapter?: MercadoLivreChannelAdapter,
    private readonly credentialsEncryptionService?: GatewayCredentialsEncryptionService,
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

  listIntegrations(tenantId: string) {
    return this.channelsRepository.listIntegrations(tenantId);
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
      const decision = await this.classifyListing(tenantId, listing);
      const saved = await this.channelsRepository.upsertListing({
        tenantId,
        integrationId: integration.id,
        provider: integration.provider,
        externalListingId: listing.externalListingId,
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

    const mappedListing = await this.channelsRepository.createManualMapping({
      tenantId,
      listingId,
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
    integration: {
      provider: ChannelProvider;
      externalAccountId?: string | null;
      encryptedCredentials?: unknown;
    },
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

    const credentials = this.credentialsEncryptionService.decrypt(
      JSON.stringify(integration.encryptedCredentials),
    );
    if (!credentials.accessToken) {
      throw new BadRequestException('Mercado Livre integration requires an access token.');
    }

    return this.mercadoLivreAdapter.fetchListings({
      accessToken: credentials.accessToken,
      externalAccountId: integration.externalAccountId,
      maxPages: dto.maxPages,
      pageSize: dto.pageSize,
    });
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
