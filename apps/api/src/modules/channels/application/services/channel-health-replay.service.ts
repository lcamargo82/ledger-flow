import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChannelIntegration,
  ChannelIntegrationStatus,
  ChannelInventorySyncStatus,
  ChannelWebhookInboxEvent,
  ChannelWebhookStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CHANNELS_REPOSITORY } from '../../domain/repositories/channels.repository';
import type { ChannelsRepository } from '../../domain/repositories/channels.repository';

type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

@Injectable()
export class ChannelHealthReplayService {
  constructor(
    @Inject(CHANNELS_REPOSITORY)
    private readonly channelsRepository: ChannelsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getHealth(tenantId: string) {
    const summary = await this.channelsRepository.getHealthSummary(tenantId);
    const degradedIntegrationCount = summary.integrations.filter((integration) =>
      this.isIntegrationDegraded(integration),
    ).length;
    const failedSignals =
      summary.failedInboxCount +
      summary.failedInventorySyncCount +
      summary.circuitOpenInventorySyncCount +
      degradedIntegrationCount;
    const retrySignals = summary.pendingInboxCount + summary.retryScheduledInventorySyncCount;

    return {
      status: this.healthStatus(failedSignals, retrySignals),
      summary: {
        integrations: summary.integrations.length,
        failedInbox: summary.failedInboxCount,
        pendingInbox: summary.pendingInboxCount,
        failedInventorySync: summary.failedInventorySyncCount,
        circuitOpenInventorySync: summary.circuitOpenInventorySyncCount,
        retryScheduledInventorySync: summary.retryScheduledInventorySyncCount,
      },
      integrations: summary.integrations.map((integration) =>
        this.sanitizeIntegration(integration),
      ),
    };
  }

  async replayWebhookInbox(tenantId: string, actorUserId: string, inboxEventId: string) {
    const inboxEvent = await this.channelsRepository.findInboxById(inboxEventId);
    if (!inboxEvent || inboxEvent.tenantId !== tenantId) {
      throw new NotFoundException('Channel webhook inbox event not found.');
    }
    if (!this.canReplayWebhook(inboxEvent)) {
      throw new BadRequestException('Only failed or unprocessed inbox events can be replayed.');
    }

    await this.channelsRepository.resetInboxForReplay(inboxEvent.id);
    await this.createOutbox(
      tenantId,
      inboxEvent.id,
      'ChannelWebhookInboxEvent',
      'channel.webhook.received',
      {
        inboxEventId: inboxEvent.id,
        provider: inboxEvent.provider,
        providerEventId: inboxEvent.providerEventId,
        status: ChannelWebhookStatus.RECEIVED,
        replay: true,
      },
    );
    await this.audit(
      tenantId,
      actorUserId,
      'channels.webhook_inbox.replayed',
      'ChannelWebhookInboxEvent',
      inboxEvent.id,
      { provider: inboxEvent.provider, eventType: inboxEvent.eventType },
    );

    return { replayed: true, inboxEventId: inboxEvent.id };
  }

  async replayFailedWebhooks(
    tenantId: string,
    actorUserId: string,
    options: { limit?: number; integrationId?: string },
  ) {
    const limit = Math.min(Math.max(options.limit || 50, 1), 100);
    const events = await this.prisma.channelWebhookInboxEvent.findMany({
      where: {
        tenantId,
        integrationId: options.integrationId,
        status: ChannelWebhookStatus.RECEIVED,
        processedAt: null,
        failureReason: { not: null },
      },
      select: { id: true },
      orderBy: { receivedAt: 'asc' },
      take: limit,
    });

    const results: Array<{ inboxEventId: string; replayed: boolean; reason?: string }> = [];
    for (const event of events) {
      try {
        await this.replayWebhookInbox(tenantId, actorUserId, event.id);
        results.push({ inboxEventId: event.id, replayed: true });
      } catch (error) {
        results.push({
          inboxEventId: event.id,
          replayed: false,
          reason: error instanceof BadRequestException ? 'NOT_REPLAYABLE' : 'REPLAY_FAILED',
        });
      }
    }

    return {
      requested: events.length,
      replayed: results.filter((result) => result.replayed).length,
      skipped: results.filter((result) => !result.replayed).length,
      results,
    };
  }

  async replayInventorySync(tenantId: string, actorUserId: string, syncStateId: string) {
    const state = await this.channelsRepository.findInventorySyncStateById(syncStateId, tenantId);
    if (!state) {
      throw new NotFoundException('Channel inventory sync state not found.');
    }
    if (!this.canReplayInventorySync(state.status)) {
      throw new BadRequestException('Only failed inventory sync states can be replayed.');
    }

    await this.channelsRepository.resetInventorySyncForReplay(state.id);
    await this.createOutbox(
      tenantId,
      state.id,
      'ChannelInventorySyncState',
      'channel.inventory_sync.requested',
      {
        syncStateId: state.id,
        listingId: state.listingId,
        skuId: state.skuId,
        provider: state.provider,
        targetAvailableQuantity: Number(state.targetAvailableQuantity),
        replay: true,
      },
    );
    await this.audit(
      tenantId,
      actorUserId,
      'channels.inventory_sync.replayed',
      'ChannelInventorySyncState',
      state.id,
      { provider: state.provider, status: state.status },
    );

    return { replayed: true, syncStateId: state.id };
  }

  private healthStatus(failedSignals: number, retrySignals: number): HealthStatus {
    if (failedSignals > 0) return 'DEGRADED';
    if (retrySignals > 0) return 'DEGRADED';
    return 'HEALTHY';
  }

  private sanitizeIntegration(integration: ChannelIntegration) {
    return {
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      healthStatus: integration.healthStatus,
      lastSuccessfulOperationAt: integration.lastSuccessfulOperationAt,
      lastFailureAt: integration.lastFailureAt,
    };
  }

  private canReplayWebhook(inboxEvent: ChannelWebhookInboxEvent) {
    return (
      inboxEvent.status === ChannelWebhookStatus.RECEIVED &&
      Boolean(inboxEvent.failureReason || !inboxEvent.processedAt)
    );
  }

  private isIntegrationDegraded(integration: ChannelIntegration) {
    return (
      integration.status !== ChannelIntegrationStatus.ACTIVE ||
      integration.healthStatus === 'degraded'
    );
  }

  private canReplayInventorySync(status: ChannelInventorySyncStatus) {
    return (
      status === ChannelInventorySyncStatus.FAILED ||
      status === ChannelInventorySyncStatus.CIRCUIT_OPEN ||
      status === ChannelInventorySyncStatus.RETRY_SCHEDULED
    );
  }

  private async createOutbox(
    tenantId: string,
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType,
        aggregateId,
        eventType,
        eventVersion: 1,
        payload: payload as Prisma.InputJsonValue,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
  }

  private async audit(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
