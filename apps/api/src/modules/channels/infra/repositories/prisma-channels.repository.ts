import { Injectable } from '@nestjs/common';
import {
  ChannelIntegrationStatus,
  ChannelInventorySyncStatus,
  ChannelListingMatchStatus,
  ChannelProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  ChannelsRepository,
  CreateChannelIntegrationData,
  CreateChannelWebhookInboxData,
  ListChannelInboxParams,
  ListChannelListingsParams,
  ListInventorySyncStatesParams,
  UpsertChannelListingData,
  UpsertInventorySyncStateData,
  UpdateChannelIntegrationSettingsData,
} from '../../domain/repositories/channels.repository';

@Injectable()
export class PrismaChannelsRepository implements ChannelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createIntegration(data: CreateChannelIntegrationData) {
    return this.prisma.channelIntegration.create({ data });
  }

  listIntegrations(tenantId: string) {
    return this.prisma.channelIntegration.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateIntegrationStatus(id: string, tenantId: string, status: ChannelIntegrationStatus) {
    return this.prisma.channelIntegration.update({
      where: { id, tenantId },
      data: { status },
    });
  }

  findIntegrationById(id: string, tenantId: string) {
    return this.prisma.channelIntegration.findFirst({
      where: { id, tenantId },
    });
  }

  findWarehouseById(id: string, tenantId: string) {
    return this.prisma.warehouse.findFirst({
      where: { id, tenantId },
      select: { id: true, isActive: true },
    });
  }

  updateIntegrationSettings(
    id: string,
    tenantId: string,
    data: UpdateChannelIntegrationSettingsData,
  ) {
    return this.prisma.channelIntegration.update({
      where: { id, tenantId },
      data,
    });
  }

  findActiveIntegrationBySecretHash(provider: ChannelProvider, secretHash: string) {
    return this.prisma.channelIntegration.findFirst({
      where: {
        provider,
        webhookSecretHash: secretHash,
        status: ChannelIntegrationStatus.ACTIVE,
      },
    });
  }

  findActiveIntegrationsByExternalAccountId(provider: ChannelProvider, externalAccountId: string) {
    return this.prisma.channelIntegration.findMany({
      where: {
        provider,
        externalAccountId,
        status: ChannelIntegrationStatus.ACTIVE,
      },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });
  }

  findInboxByProviderEventId(provider: ChannelProvider, providerEventId: string) {
    return this.prisma.channelWebhookInboxEvent.findUnique({
      where: { provider_providerEventId: { provider, providerEventId } },
    });
  }

  findInboxById(id: string) {
    return this.prisma.channelWebhookInboxEvent.findUnique({
      where: { id },
      include: { integration: true },
    });
  }

  createInboxEvent(data: CreateChannelWebhookInboxData) {
    return this.prisma.channelWebhookInboxEvent.create({ data });
  }

  markInboxProcessed(id: string) {
    return this.prisma.channelWebhookInboxEvent.update({
      where: { id },
      data: {
        processedAt: new Date(),
        failureReason: null,
      },
    });
  }

  markInboxFailed(id: string, failureReason: string) {
    return this.prisma.channelWebhookInboxEvent.update({
      where: { id },
      data: {
        failureReason,
      },
    });
  }

  async listInbox(params: ListChannelInboxParams) {
    const { tenantId, page = 1, perPage = 10, provider, status } = params;
    const search = params.search?.trim();
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.ChannelWebhookInboxEventWhereInput = {
      tenantId,
      provider,
      status,
      ...(search && {
        OR: [
          { providerEventId: { contains: search, mode: 'insensitive' } },
          { eventType: { contains: search, mode: 'insensitive' } },
          { failureReason: { contains: search, mode: 'insensitive' } },
          { payloadHash: { contains: search, mode: 'insensitive' } },
          { payloadSummary: { path: ['resource'], string_contains: search } },
          { payloadSummary: { path: ['topic'], string_contains: search } },
          { payloadSummary: { path: ['user_id'], string_contains: search } },
          { payloadSummary: { path: ['application_id'], string_contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.channelWebhookInboxEvent.findMany({
        where,
        skip,
        take,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.channelWebhookInboxEvent.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  findSkuMatchCandidates(tenantId: string, externalSku: string) {
    const normalizedSku = externalSku.trim().toUpperCase();

    return this.prisma.productSku.findMany({
      where: {
        tenantId,
        OR: [
          { skuCanonical: normalizedSku },
          { skuDisplay: { equals: externalSku.trim(), mode: 'insensitive' } },
          { barcode: externalSku.trim() },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  upsertListing(data: UpsertChannelListingData) {
    return this.prisma.channelListing.upsert({
      where: {
        tenantId_integrationId_externalListingId: {
          tenantId: data.tenantId,
          integrationId: data.integrationId,
          externalListingId: data.externalListingId,
        },
      },
      update: {
        title: data.title,
        externalSku: data.externalSku,
        externalUserProductId: data.externalUserProductId,
        matchStatus: data.matchStatus,
        matchedSkuId: data.matchedSkuId,
        candidateSkuIds: data.candidateSkuIds,
        importedAt: new Date(),
        ignoredAt: data.matchStatus === ChannelListingMatchStatus.IGNORED ? new Date() : null,
      },
      create: {
        tenantId: data.tenantId,
        integrationId: data.integrationId,
        provider: data.provider,
        externalListingId: data.externalListingId,
        externalUserProductId: data.externalUserProductId,
        title: data.title,
        externalSku: data.externalSku,
        matchStatus: data.matchStatus,
        matchedSkuId: data.matchedSkuId,
        candidateSkuIds: data.candidateSkuIds,
        ignoredAt: data.matchStatus === ChannelListingMatchStatus.IGNORED ? new Date() : null,
      },
    });
  }

  async listListings(params: ListChannelListingsParams) {
    const { tenantId, page = 1, perPage = 10, provider, status } = params;
    const search = params.search?.trim();
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.ChannelListingWhereInput = {
      tenantId,
      provider,
      matchStatus: status,
      ...(search && {
        OR: [
          { externalListingId: { contains: search, mode: 'insensitive' } },
          { externalUserProductId: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { externalSku: { contains: search, mode: 'insensitive' } },
          { matchedSku: { skuCanonical: { contains: search, mode: 'insensitive' } } },
          { matchedSku: { skuDisplay: { contains: search, mode: 'insensitive' } } },
          { matchedSku: { product: { name: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
    };

    const [listings, total] = await Promise.all([
      this.prisma.channelListing.findMany({
        where,
        skip,
        take,
        orderBy: { importedAt: 'desc' },
      }),
      this.prisma.channelListing.count({ where }),
    ]);

    const candidateIds = [
      ...new Set(listings.flatMap((listing) => this.candidateSkuIds(listing.candidateSkuIds))),
    ];
    const candidateSkus = candidateIds.length
      ? await this.prisma.productSku.findMany({
          where: { tenantId, id: { in: candidateIds } },
          select: {
            id: true,
            skuCanonical: true,
            skuDisplay: true,
            product: { select: { name: true } },
          },
        })
      : [];
    const candidateById = new Map(candidateSkus.map((sku) => [sku.id, sku]));
    const data = listings.map((listing) => ({
      ...listing,
      candidateSkus: this.candidateSkuIds(listing.candidateSkuIds)
        .map((id) => candidateById.get(id))
        .filter((sku): sku is (typeof candidateSkus)[number] => Boolean(sku)),
    }));

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  listSkuOptions(params: { tenantId: string; search?: string; limit: number }) {
    const search = params.search?.trim();
    const normalizedSearch = search?.toUpperCase();
    return this.prisma.productSku.findMany({
      where: {
        tenantId: params.tenantId,
        product: { status: 'ACTIVE' },
        ...(search && {
          OR: [
            { product: { name: { contains: search, mode: 'insensitive' } } },
            { skuCanonical: { contains: normalizedSearch, mode: 'insensitive' } },
            { skuDisplay: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        skuCanonical: true,
        skuDisplay: true,
        product: { select: { name: true } },
      },
      take: Math.min(params.limit, 100),
      orderBy: [{ product: { name: 'asc' } }, { skuDisplay: 'asc' }],
    });
  }

  findListingById(id: string, tenantId: string) {
    return this.prisma.channelListing.findFirst({
      where: { id, tenantId },
    });
  }

  findListingByExternalId(params: {
    tenantId: string;
    integrationId: string;
    externalListingId: string;
  }) {
    return this.prisma.channelListing.findUnique({
      where: {
        tenantId_integrationId_externalListingId: {
          tenantId: params.tenantId,
          integrationId: params.integrationId,
          externalListingId: params.externalListingId,
        },
      },
    });
  }

  findSkuById(id: string, tenantId: string) {
    return this.prisma.productSku.findFirst({
      where: { id, tenantId },
    });
  }

  createManualMappingGroup(params: {
    tenantId: string;
    listingId: string;
    integrationId: string;
    externalUserProductId?: string | null;
    skuId: string;
    actorUserId: string;
    reason?: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const relatedListings = params.externalUserProductId
        ? await tx.channelListing.findMany({
            where: {
              tenantId: params.tenantId,
              integrationId: params.integrationId,
              externalUserProductId: params.externalUserProductId,
            },
            select: { id: true },
          })
        : [{ id: params.listingId }];
      const listingIds = relatedListings.map((listing) => listing.id);

      for (const relatedListingId of listingIds) {
        await tx.listingSkuMapping.upsert({
          where: {
            tenantId_listingId: {
              tenantId: params.tenantId,
              listingId: relatedListingId,
            },
          },
          update: {
            skuId: params.skuId,
            mappedByUserId: params.actorUserId,
            reason: params.reason,
          },
          create: {
            tenantId: params.tenantId,
            listingId: relatedListingId,
            skuId: params.skuId,
            mappedByUserId: params.actorUserId,
            reason: params.reason,
          },
        });
      }

      await tx.channelListing.updateMany({
        where: { tenantId: params.tenantId, id: { in: listingIds } },
        data: {
          matchedSkuId: params.skuId,
          matchStatus: ChannelListingMatchStatus.MATCHED,
          candidateSkuIds: Prisma.JsonNull,
          ignoredAt: null,
        },
      });

      return tx.channelListing.findFirstOrThrow({
        where: { id: params.listingId, tenantId: params.tenantId },
      });
    });
  }

  findSyncableListingsBySku(tenantId: string, skuId: string) {
    return this.prisma.channelListing.findMany({
      where: {
        tenantId,
        matchedSkuId: skuId,
        matchStatus: ChannelListingMatchStatus.MATCHED,
        integration: {
          status: ChannelIntegrationStatus.ACTIVE,
          settingsJson: {
            path: ['syncEnabled'],
            equals: true,
          },
        },
      },
      select: {
        id: true,
        tenantId: true,
        integrationId: true,
        provider: true,
        externalListingId: true,
        externalUserProductId: true,
        matchedSkuId: true,
      },
    });
  }

  upsertInventorySyncState(data: UpsertInventorySyncStateData) {
    return this.prisma.channelInventorySyncState.upsert({
      where: { listingId: data.listingId },
      update: {
        targetAvailableQuantity: data.targetAvailableQuantity,
        status: ChannelInventorySyncStatus.PENDING,
        circuitState: 'CLOSED',
        nextAttemptAt: null,
        lastRequestedAt: new Date(),
        lastErrorCode: null,
        lastErrorSummary: null,
      },
      create: {
        tenantId: data.tenantId,
        listingId: data.listingId,
        integrationId: data.integrationId,
        provider: data.provider,
        externalListingId: data.externalListingId,
        skuId: data.skuId,
        targetAvailableQuantity: data.targetAvailableQuantity,
      },
    });
  }

  async listInventorySyncStates(params: ListInventorySyncStatesParams) {
    const { tenantId, page = 1, perPage = 10, provider, status } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.ChannelInventorySyncStateWhereInput = {
      tenantId,
      provider,
      status,
    };

    const [states, total] = await Promise.all([
      this.prisma.channelInventorySyncState.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.channelInventorySyncState.count({ where }),
    ]);

    const skus = states.length
      ? await this.prisma.productSku.findMany({
          where: {
            tenantId,
            id: { in: [...new Set(states.map((state) => state.skuId))] },
          },
          select: {
            id: true,
            skuCanonical: true,
            skuDisplay: true,
            product: { select: { name: true } },
          },
        })
      : [];
    const skuById = new Map(skus.map((sku) => [sku.id, sku]));
    const data = states.map((state) => ({
      ...state,
      sku: skuById.get(state.skuId) ?? null,
    }));

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  async getHealthSummary(tenantId: string) {
    const [
      integrations,
      failedInboxCount,
      pendingInboxCount,
      failedInventorySyncCount,
      circuitOpenInventorySyncCount,
      retryScheduledInventorySyncCount,
    ] = await Promise.all([
      this.prisma.channelIntegration.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.channelWebhookInboxEvent.count({
        where: { tenantId, failureReason: { not: null } },
      }),
      this.prisma.channelWebhookInboxEvent.count({
        where: { tenantId, processedAt: null, failureReason: null },
      }),
      this.prisma.channelInventorySyncState.count({
        where: { tenantId, status: ChannelInventorySyncStatus.FAILED },
      }),
      this.prisma.channelInventorySyncState.count({
        where: { tenantId, status: ChannelInventorySyncStatus.CIRCUIT_OPEN },
      }),
      this.prisma.channelInventorySyncState.count({
        where: { tenantId, status: ChannelInventorySyncStatus.RETRY_SCHEDULED },
      }),
    ]);

    return {
      integrations,
      failedInboxCount,
      pendingInboxCount,
      failedInventorySyncCount,
      circuitOpenInventorySyncCount,
      retryScheduledInventorySyncCount,
    };
  }

  findInventorySyncStateById(id: string, tenantId: string) {
    return this.prisma.channelInventorySyncState.findFirst({
      where: { id, tenantId },
    });
  }

  resetInventorySyncForReplay(id: string) {
    return this.prisma.channelInventorySyncState.update({
      where: { id },
      data: {
        status: ChannelInventorySyncStatus.PENDING,
        circuitState: 'CLOSED',
        nextAttemptAt: null,
        circuitOpenedUntil: null,
        lastErrorCode: null,
        lastErrorSummary: null,
      },
    });
  }

  resetInboxForReplay(id: string) {
    return this.prisma.channelWebhookInboxEvent.update({
      where: { id },
      data: {
        processedAt: null,
        failureReason: null,
      },
    });
  }

  findPendingInventorySyncStates(params: { tenantId: string; limit: number; now: Date }) {
    return this.prisma.channelInventorySyncState.findMany({
      where: {
        tenantId: params.tenantId,
        status: {
          in: [ChannelInventorySyncStatus.PENDING, ChannelInventorySyncStatus.RETRY_SCHEDULED],
        },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: params.now } }],
      },
      take: params.limit,
      orderBy: [{ nextAttemptAt: 'asc' }, { updatedAt: 'asc' }],
    });
  }

  markInventorySyncSuccess(params: { id: string; quantity: number; now: Date }) {
    return this.prisma.channelInventorySyncState.update({
      where: { id: params.id },
      data: {
        status: ChannelInventorySyncStatus.SYNCED,
        circuitState: 'CLOSED',
        lastSyncedQuantity: params.quantity,
        lastSyncedAt: params.now,
        nextAttemptAt: null,
        circuitOpenedUntil: null,
        lastErrorCode: null,
        lastErrorSummary: null,
      },
    });
  }

  markInventorySyncRetry(params: {
    id: string;
    nextAttemptAt: Date;
    errorCode: string;
    errorSummary: string;
  }) {
    return this.prisma.channelInventorySyncState.update({
      where: { id: params.id },
      data: {
        status: ChannelInventorySyncStatus.RETRY_SCHEDULED,
        circuitState: 'CLOSED',
        attemptCount: { increment: 1 },
        nextAttemptAt: params.nextAttemptAt,
        lastErrorCode: params.errorCode,
        lastErrorSummary: params.errorSummary,
      },
    });
  }

  markInventorySyncCircuitOpen(params: {
    id: string;
    circuitOpenedUntil: Date;
    errorCode: string;
    errorSummary: string;
  }) {
    return this.prisma.channelInventorySyncState.update({
      where: { id: params.id },
      data: {
        status: ChannelInventorySyncStatus.CIRCUIT_OPEN,
        circuitState: 'OPEN',
        attemptCount: { increment: 1 },
        nextAttemptAt: params.circuitOpenedUntil,
        circuitOpenedUntil: params.circuitOpenedUntil,
        lastErrorCode: params.errorCode,
        lastErrorSummary: params.errorSummary,
      },
    });
  }

  private candidateSkuIds(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }
}
