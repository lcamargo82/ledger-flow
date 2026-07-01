import { Injectable } from '@nestjs/common';
import {
  Prisma,
  WebhookInboxEvent,
  WebhookProcessingStatus,
  WebhookProvider,
} from '@prisma/client';
import {
  CreateWebhookInboxEventInput,
  IWebhookInboxRepository,
} from '../../domain/interfaces/webhook-inbox.repository';
import { PrismaService } from '../../../../database/prisma/prisma.service';

@Injectable()
export class PrismaWebhookInboxRepository implements IWebhookInboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProviderEventId(
    provider: WebhookProvider,
    providerEventId: string,
  ): Promise<WebhookInboxEvent | null> {
    return this.prisma.webhookInboxEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider,
          providerEventId,
        },
      },
    });
  }

  async createReceived(
    data: CreateWebhookInboxEventInput,
  ): Promise<WebhookInboxEvent> {
    return this.prisma.$transaction(async (tx) => {
      const inboxEvent = await tx.webhookInboxEvent.create({
        data: {
          provider: data.provider,
          providerEventId: data.providerEventId,
          eventType: data.eventType,
          providerPaymentId: data.providerPaymentId,
          externalReference: data.externalReference,
          providerPaymentStatus: data.providerPaymentStatus,
          payloadHash: data.payloadHash,
          payloadSummary:
            (data.payloadSummary as Prisma.InputJsonValue) ?? undefined,
          status: WebhookProcessingStatus.RECEIVED,
          tenantId: data.tenantId,
          paymentId: data.paymentId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: data.tenantId,
          aggregateType: 'WebhookInboxEvent',
          aggregateId: inboxEvent.id,
          eventType: 'webhook.inbound_processing_requested',
          eventVersion: 1,
          payload: {}, // Summary is already in inboxEvent, payload is minimal
          payloadHash: data.payloadHash,
        },
      });

      return inboxEvent;
    });
  }

  async createIgnored(
    data: CreateWebhookInboxEventInput,
    reason: string,
  ): Promise<WebhookInboxEvent> {
    return this.prisma.webhookInboxEvent.create({
      data: {
        provider: data.provider,
        providerEventId: data.providerEventId,
        eventType: data.eventType,
        providerPaymentId: data.providerPaymentId,
        externalReference: data.externalReference,
        providerPaymentStatus: data.providerPaymentStatus,
        payloadHash: data.payloadHash,
        payloadSummary:
          (data.payloadSummary as Prisma.InputJsonValue) ?? undefined,
        status: WebhookProcessingStatus.IGNORED,
        failureReason: reason,
      },
    });
  }

  async createInvalid(
    data: CreateWebhookInboxEventInput,
    reason: string,
  ): Promise<WebhookInboxEvent> {
    return this.prisma.webhookInboxEvent.create({
      data: {
        provider: data.provider,
        providerEventId: data.providerEventId,
        eventType: data.eventType,
        providerPaymentId: data.providerPaymentId,
        externalReference: data.externalReference,
        providerPaymentStatus: data.providerPaymentStatus,
        payloadHash: data.payloadHash,
        payloadSummary:
          (data.payloadSummary as Prisma.InputJsonValue) ?? undefined,
        status: WebhookProcessingStatus.INVALID,
        failureReason: reason,
      },
    });
  }

  async createUnmatched(
    data: CreateWebhookInboxEventInput,
    reason: string,
  ): Promise<WebhookInboxEvent> {
    return this.prisma.webhookInboxEvent.create({
      data: {
        provider: data.provider,
        providerEventId: data.providerEventId,
        eventType: data.eventType,
        providerPaymentId: data.providerPaymentId,
        externalReference: data.externalReference,
        providerPaymentStatus: data.providerPaymentStatus,
        payloadHash: data.payloadHash,
        payloadSummary:
          (data.payloadSummary as Prisma.InputJsonValue) ?? undefined,
        status: WebhookProcessingStatus.UNMATCHED,
        failureReason: reason,
      },
    });
  }
  async markProcessing(id: string): Promise<WebhookInboxEvent> {
    return this.prisma.webhookInboxEvent.update({
      where: { id },
      data: {
        status: WebhookProcessingStatus.PROCESSING,
      },
    });
  }

  async markProcessed(
    id: string,
    paymentId?: string,
    gatewayConfigurationId?: string,
    tenantId?: string,
  ): Promise<WebhookInboxEvent> {
    return this.prisma.webhookInboxEvent.update({
      where: { id },
      data: {
        status: WebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
        paymentId,
        gatewayConfigurationId,
        tenantId,
      },
    });
  }

  async markIgnored(
    id: string,
    reason?: string,
    paymentId?: string,
    gatewayConfigurationId?: string,
    tenantId?: string,
  ): Promise<WebhookInboxEvent> {
    return this.prisma.webhookInboxEvent.update({
      where: { id },
      data: {
        status: WebhookProcessingStatus.IGNORED,
        processedAt: new Date(),
        failureReason: reason,
        paymentId,
        gatewayConfigurationId,
        tenantId,
      },
    });
  }

  async markFailed(id: string, reason: string): Promise<WebhookInboxEvent> {
    return this.prisma.webhookInboxEvent.update({
      where: { id },
      data: {
        status: WebhookProcessingStatus.FAILED,
        failedAt: new Date(),
        failureReason: reason,
      },
    });
  }

  async incrementAttempt(id: string): Promise<WebhookInboxEvent> {
    return this.prisma.webhookInboxEvent.update({
      where: { id },
      data: {
        attemptCount: { increment: 1 },
      },
    });
  }

  async findRecentByPaymentId(paymentId: string): Promise<WebhookInboxEvent[]> {
    return this.prisma.webhookInboxEvent.findMany({
      where: { paymentId },
      orderBy: { receivedAt: 'desc' },
      take: 10,
    });
  }
}
