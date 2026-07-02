import { Inject, Injectable } from '@nestjs/common';
import { ChannelIntegrationStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreateChannelIntegrationDto } from '../dto/create-channel-integration.dto';
import { ListChannelInboxQueryDto } from '../dto/list-channel-inbox-query.dto';
import { CHANNELS_REPOSITORY } from '../../domain/repositories/channels.repository';
import type { ChannelsRepository } from '../../domain/repositories/channels.repository';

@Injectable()
export class ChannelsService {
  constructor(
    @Inject(CHANNELS_REPOSITORY)
    private readonly channelsRepository: ChannelsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createIntegration(tenantId: string, actorUserId: string, dto: CreateChannelIntegrationDto) {
    const integration = await this.channelsRepository.createIntegration({
      tenantId,
      provider: dto.provider,
      name: dto.name,
      webhookSecretHash: this.hash(dto.webhookSecret),
      createdByUserId: actorUserId,
    });

    await this.audit(tenantId, actorUserId, 'channels.integration.created', integration.id, {
      provider: dto.provider,
      name: dto.name,
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

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async audit(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'ChannelIntegration',
        entityId,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }
}
