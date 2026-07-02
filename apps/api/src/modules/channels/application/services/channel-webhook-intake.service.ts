import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ChannelProvider, ChannelWebhookStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CHANNELS_REPOSITORY } from '../../domain/repositories/channels.repository';
import type { ChannelsRepository } from '../../domain/repositories/channels.repository';

type ChannelWebhookPayload = Record<string, unknown>;

@Injectable()
export class ChannelWebhookIntakeService {
  constructor(
    @Inject(CHANNELS_REPOSITORY)
    private readonly channelsRepository: ChannelsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async ingest(provider: ChannelProvider, webhookSecret: string | undefined, payload: unknown) {
    const secretHash = this.hash(webhookSecret ?? '');
    const integration = await this.channelsRepository.findActiveIntegrationBySecretHash(
      provider,
      secretHash,
    );

    if (!integration) {
      throw new ForbiddenException('Invalid channel webhook credentials.');
    }

    const normalizedPayload = this.asPayload(payload);
    const payloadHash = this.hash(JSON.stringify(normalizedPayload));
    const validation = this.validatePayload(normalizedPayload);
    const providerEventId = validation.eventId ?? `invalid-${randomUUID()}`;

    const existing = await this.channelsRepository.findInboxByProviderEventId(
      provider,
      providerEventId,
    );
    if (existing) {
      return {
        id: existing.id,
        status: ChannelWebhookStatus.DUPLICATE,
        duplicateOfId: existing.id,
      };
    }

    const inboxEvent = await this.channelsRepository.createInboxEvent({
      tenantId: integration.tenantId,
      integrationId: integration.id,
      provider,
      providerEventId,
      eventType: validation.eventType ?? 'unknown',
      status: validation.isValid ? ChannelWebhookStatus.RECEIVED : ChannelWebhookStatus.INVALID,
      payloadHash,
      payloadSummary: this.sanitizePayload(normalizedPayload) as Prisma.InputJsonValue,
      failureReason: validation.isValid ? null : validation.reason,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: integration.tenantId,
        action: validation.isValid ? 'channels.webhook.received' : 'channels.webhook.invalid',
        entityType: 'ChannelWebhookInboxEvent',
        entityId: inboxEvent.id,
        metadata: {
          provider,
          eventType: validation.eventType ?? 'unknown',
          status: inboxEvent.status,
        },
      },
    });

    const eventType = validation.isValid ? 'channel.webhook.received' : 'channel.webhook.invalid';
    await this.prisma.outboxEvent.create({
      data: {
        tenantId: integration.tenantId,
        aggregateType: 'ChannelWebhookInboxEvent',
        aggregateId: inboxEvent.id,
        eventType,
        eventVersion: 1,
        payload: {
          inboxEventId: inboxEvent.id,
          provider,
          providerEventId,
          status: inboxEvent.status,
        },
        payloadHash: this.hash(
          JSON.stringify({
            inboxEventId: inboxEvent.id,
            provider,
            providerEventId,
            status: inboxEvent.status,
          }),
        ),
      },
    });

    return inboxEvent;
  }

  private validatePayload(payload: ChannelWebhookPayload): {
    isValid: boolean;
    eventId?: string;
    eventType?: string;
    reason?: string;
  } {
    const eventId = typeof payload.eventId === 'string' ? payload.eventId.trim() : '';
    const eventType = typeof payload.eventType === 'string' ? payload.eventType.trim() : '';

    if (!eventId) {
      return { isValid: false, eventType, reason: 'eventId is required' };
    }

    if (!eventType) {
      return { isValid: false, eventId, reason: 'eventType is required' };
    }

    return { isValid: true, eventId, eventType };
  }

  private sanitizePayload(payload: ChannelWebhookPayload) {
    const order = this.asPayload(payload.order);
    return {
      ...(typeof payload.eventId === 'string' && { eventId: payload.eventId }),
      ...(typeof payload.eventType === 'string' && { eventType: payload.eventType }),
      ...(typeof payload.occurredAt === 'string' && { occurredAt: payload.occurredAt }),
      ...(typeof order.externalOrderId === 'string' && {
        externalOrderId: order.externalOrderId,
      }),
      ...(typeof order.status === 'string' && { externalStatus: order.status }),
    };
  }

  private asPayload(payload: unknown): ChannelWebhookPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    return payload as ChannelWebhookPayload;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
