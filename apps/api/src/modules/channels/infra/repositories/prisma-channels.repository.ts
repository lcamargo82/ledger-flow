import { Injectable } from '@nestjs/common';
import {
  ChannelIntegrationStatus,
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
      where: { id },
      data: { status },
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
}
