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
    const normalizedPayload = this.asPayload(payload);
    const integration =
      provider === ChannelProvider.MERCADO_LIVRE
        ? await this.findMercadoLivreIntegration(provider, normalizedPayload)
        : await this.findSecretBasedIntegration(provider, webhookSecret);

    if (!integration) {
      throw new ForbiddenException('Invalid channel webhook credentials.');
    }

    const payloadHash = this.hash(JSON.stringify(normalizedPayload));
    const validation =
      provider === ChannelProvider.MERCADO_LIVRE
        ? this.validateMercadoLivrePayload(normalizedPayload)
        : this.validatePayload(normalizedPayload);
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
      payloadSummary:
        provider === ChannelProvider.MERCADO_LIVRE
          ? this.sanitizeMercadoLivrePayload(normalizedPayload)
          : this.sanitizePayload(normalizedPayload),
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
          ...(provider === ChannelProvider.MERCADO_LIVRE && {
            topic: validation.eventType,
            resource: this.asString(normalizedPayload.resource),
            integrationId: integration.id,
          }),
        },
        payloadHash: this.hash(
          JSON.stringify({
            inboxEventId: inboxEvent.id,
            provider,
            providerEventId,
            status: inboxEvent.status,
            ...(provider === ChannelProvider.MERCADO_LIVRE && {
              topic: validation.eventType,
              resource: this.asString(normalizedPayload.resource),
              integrationId: integration.id,
            }),
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

  private validateMercadoLivrePayload(payload: ChannelWebhookPayload): {
    isValid: boolean;
    eventId?: string;
    eventType?: string;
    reason?: string;
  } {
    const topic = this.asString(payload.topic);
    const resource = this.asString(payload.resource);
    const userId = this.asString(payload.user_id);
    const applicationId = this.asString(payload.application_id);
    const notificationId = this.asString(payload._id);

    if (!topic) return { isValid: false, reason: 'topic is required' };
    if (!resource) return { isValid: false, eventType: topic, reason: 'resource is required' };
    if (!userId) return { isValid: false, eventType: topic, reason: 'user_id is required' };

    return {
      isValid: true,
      eventId: notificationId || [topic, resource, userId, applicationId].filter(Boolean).join(':'),
      eventType: topic,
    };
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

  private sanitizeMercadoLivrePayload(payload: ChannelWebhookPayload) {
    const notificationId = this.asString(payload._id);
    const applicationId = this.asString(payload.application_id);

    return {
      ...(notificationId && { notificationId }),
      ...(this.asString(payload.topic) && { topic: this.asString(payload.topic) }),
      ...(this.asString(payload.resource) && { resource: this.asString(payload.resource) }),
      ...(this.asString(payload.user_id) && { userId: this.asString(payload.user_id) }),
      ...(applicationId && { applicationId }),
      ...(typeof payload.attempts === 'number' && { attempts: payload.attempts }),
      ...(this.asString(payload.sent) && { sent: this.asString(payload.sent) }),
      ...(this.asString(payload.received) && { received: this.asString(payload.received) }),
    };
  }

  private async findSecretBasedIntegration(
    provider: ChannelProvider,
    webhookSecret: string | undefined,
  ) {
    const secretHash = this.hash(webhookSecret ?? '');
    return this.channelsRepository.findActiveIntegrationBySecretHash(provider, secretHash);
  }

  private async findMercadoLivreIntegration(
    provider: ChannelProvider,
    payload: ChannelWebhookPayload,
  ) {
    const userId = this.asString(payload.user_id);
    if (!userId) return null;
    return this.channelsRepository.findActiveIntegrationByExternalAccountId(provider, userId);
  }

  private asPayload(payload: unknown): ChannelWebhookPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    return payload as ChannelWebhookPayload;
  }

  private asString(value: unknown) {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
