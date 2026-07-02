import { Injectable } from '@nestjs/common';
import {
  ChannelIntegrationStatus,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  ChannelsRepository,
  CreateChannelIntegrationData,
  CreateChannelWebhookInboxData,
  ListChannelInboxParams,
  ListChannelListingsParams,
  UpsertChannelListingData,
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

  findActiveIntegrationBySecretHash(provider: ChannelProvider, secretHash: string) {
    return this.prisma.channelIntegration.findFirst({
      where: {
        provider,
        webhookSecretHash: secretHash,
        status: ChannelIntegrationStatus.ACTIVE,
      },
    });
  }

  findInboxByProviderEventId(provider: ChannelProvider, providerEventId: string) {
    return this.prisma.channelWebhookInboxEvent.findUnique({
      where: { provider_providerEventId: { provider, providerEventId } },
    });
  }

  createInboxEvent(data: CreateChannelWebhookInboxData) {
    return this.prisma.channelWebhookInboxEvent.create({ data });
  }

  async listInbox(params: ListChannelInboxParams) {
    const { tenantId, page = 1, perPage = 10, provider, status } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.ChannelWebhookInboxEventWhereInput = {
      tenantId,
      provider,
      status,
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
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where: Prisma.ChannelListingWhereInput = {
      tenantId,
      provider,
      matchStatus: status,
    };

    const [data, total] = await Promise.all([
      this.prisma.channelListing.findMany({
        where,
        skip,
        take,
        orderBy: { importedAt: 'desc' },
      }),
      this.prisma.channelListing.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  findListingById(id: string, tenantId: string) {
    return this.prisma.channelListing.findFirst({
      where: { id, tenantId },
    });
  }

  findSkuById(id: string, tenantId: string) {
    return this.prisma.productSku.findFirst({
      where: { id, tenantId },
    });
  }

  createManualMapping(params: {
    tenantId: string;
    listingId: string;
    skuId: string;
    actorUserId: string;
    reason?: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.listingSkuMapping.upsert({
        where: {
          tenantId_listingId: {
            tenantId: params.tenantId,
            listingId: params.listingId,
          },
        },
        update: {
          skuId: params.skuId,
          mappedByUserId: params.actorUserId,
          reason: params.reason,
        },
        create: {
          tenantId: params.tenantId,
          listingId: params.listingId,
          skuId: params.skuId,
          mappedByUserId: params.actorUserId,
          reason: params.reason,
        },
      });

      return tx.channelListing.update({
        where: { id: params.listingId },
        data: {
          matchedSkuId: params.skuId,
          matchStatus: ChannelListingMatchStatus.MATCHED,
          candidateSkuIds: Prisma.JsonNull,
          ignoredAt: null,
        },
      });
    });
  }
}
