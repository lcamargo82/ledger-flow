import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChannelIntegration,
  ChannelIntegrationStatus,
  ChannelListing,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { FinancialIntelligenceService } from '../../../financial-intelligence/application/services/financial-intelligence.service';
import { GatewayCredentialsEncryptionService } from '../../../gateways/application/services/gateway-credentials-encryption.service';
import { NotificationProducerService } from '../../../notifications/application/services/notification-producer.service';
import { OrdersService } from '../../../orders/application/services/orders.service';
import {
  ChannelOrderAdapter,
  ChannelOrderDetails,
  ChannelOrderItem,
} from '../../domain/interfaces/channel-provider-adapter.interface';
import {
  CHANNELS_REPOSITORY,
  ChannelWebhookInboxWithIntegration,
} from '../../domain/repositories/channels.repository';
import type { ChannelsRepository } from '../../domain/repositories/channels.repository';
import { MercadoLivreChannelAdapter } from '../../infra/adapters/mercado-livre-channel.adapter';
import { MercadoLivreCredentialsService } from './mercado-livre-credentials.service';

type PayloadSummary = Record<string, unknown>;

@Injectable()
export class ChannelOrderIntakeService {
  constructor(
    @Inject(CHANNELS_REPOSITORY)
    private readonly channelsRepository: ChannelsRepository,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly mercadoLivreAdapter: MercadoLivreChannelAdapter,
    private readonly credentialsEncryptionService: GatewayCredentialsEncryptionService,
    private readonly prisma: PrismaService,
    private readonly financialIntelligenceService?: FinancialIntelligenceService,
    private readonly notificationProducer?: NotificationProducerService,
    private readonly mercadoLivreCredentialsService?: MercadoLivreCredentialsService,
  ) {}

  async processInboxEvent(inboxEventId: string) {
    const inboxEvent = await this.channelsRepository.findInboxById(inboxEventId);
    if (!inboxEvent) {
      throw new NotFoundException('Channel webhook inbox event not found.');
    }

    if (inboxEvent.status !== ChannelWebhookStatus.RECEIVED || inboxEvent.processedAt) {
      return { ignored: true };
    }

    if (!this.isOrderTopic(inboxEvent)) {
      await this.channelsRepository.markInboxProcessed(inboxEvent.id);
      return { ignored: true };
    }

    try {
      const result = await this.processOrderInbox(inboxEvent);
      await this.channelsRepository.markInboxProcessed(inboxEvent.id);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown order intake failure.';
      await this.channelsRepository.markInboxFailed(inboxEvent.id, message);
      throw error;
    }
  }

  private async processOrderInbox(inboxEvent: ChannelWebhookInboxWithIntegration) {
    if (inboxEvent.provider !== ChannelProvider.MERCADO_LIVRE) {
      throw new BadRequestException('Unsupported channel order provider.');
    }

    const integration = inboxEvent.integration;
    this.assertActiveIntegration(integration);

    const resource = this.getResource(inboxEvent.payloadSummary);
    const accessToken = this.mercadoLivreCredentialsService
      ? await this.mercadoLivreCredentialsService.getAccessToken(integration)
      : this.credentialsEncryptionService.decrypt(JSON.stringify(integration.encryptedCredentials))
          .accessToken;
    if (!accessToken) {
      throw new BadRequestException('Channel integration access token is required.');
    }

    const order = await this.getAdapter(inboxEvent.provider).fetchOrder({
      accessToken,
      resource,
    });
    const orderItems = await this.mapOrderItems(integration, order.items);
    const actorUserId = this.actorUserId(integration.id);
    const baseIdempotencyKey = this.orderIdempotencyKey(inboxEvent.provider, integration.id, order);

    const created = await this.ordersService.create(integration.tenantId, actorUserId, {
      idempotencyKey: baseIdempotencyKey,
      customerName: order.buyerName,
      notes: `Mercado Livre order ${order.externalOrderId}`,
      items: orderItems,
    });
    const transitioned = await this.applyOrderTransition(
      order,
      created.order.id,
      integration.tenantId,
      actorUserId,
      baseIdempotencyKey,
    );
    await this.createOperationalFinancialFact(
      order,
      transitioned?.order.id ?? created.order.id,
      integration.tenantId,
      actorUserId,
      inboxEvent.provider,
    );
    await this.upsertShippingSummary(
      order,
      transitioned?.order.id ?? created.order.id,
      integration.tenantId,
      inboxEvent.provider,
    );

    return {
      orderId: transitioned?.order.id ?? created.order.id,
      status: transitioned?.order.status ?? created.order.status,
    };
  }

  private async createOperationalFinancialFact(
    order: ChannelOrderDetails,
    orderId: string,
    tenantId: string,
    actorUserId: string,
    provider: ChannelProvider,
  ) {
    if (!order.financial || !this.financialIntelligenceService) return;

    await this.financialIntelligenceService.createChannelOrderOperationalFact(
      orderId,
      tenantId,
      actorUserId,
      {
        provider,
        externalOrderId: order.externalOrderId,
        ...order.financial,
      },
    );
  }

  private async upsertShippingSummary(
    order: ChannelOrderDetails,
    orderId: string,
    tenantId: string,
    provider: ChannelProvider,
  ) {
    if (!order.shipping) return;

    const data = {
      tenantId,
      orderId,
      provider,
      externalOrderId: order.externalOrderId,
      externalShipmentId: order.shipping.externalShipmentId,
      status: order.shipping.status,
      substatus: order.shipping.substatus,
      shippingMode: order.shipping.shippingMode,
      logisticType: order.shipping.logisticType,
      handlingEstimateAt: this.toDate(order.shipping.handlingEstimateAt),
      deliveryEstimateAt: this.toDate(order.shipping.deliveryEstimateAt),
      postedAt: this.toDate(order.shipping.postedAt),
      trackingCodeMasked: order.shipping.trackingCodeMasked,
      source: order.shipping.source,
      confidence: order.shipping.confidence,
      lastSyncedAt: new Date(),
    };
    const where = {
      tenantId_orderId_provider: {
        tenantId,
        orderId,
        provider,
      },
    };
    const existing = await this.prisma.orderShippingSummary.findUnique({ where });
    const changed = !existing || this.shippingChanged(existing, data);

    const summary = await this.prisma.orderShippingSummary.upsert({
      where,
      create: data,
      update: data,
    });

    if (!changed) return;

    const payload = {
      orderId,
      provider,
      externalOrderId: order.externalOrderId,
      externalShipmentId: order.shipping.externalShipmentId,
      status: order.shipping.status,
      substatus: order.shipping.substatus,
      shippingMode: order.shipping.shippingMode,
      logisticType: order.shipping.logisticType,
      trackingCodeMasked: order.shipping.trackingCodeMasked,
      source: order.shipping.source,
      confidence: order.shipping.confidence,
    };

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'OrderShippingSummary',
        aggregateId: summary.id,
        eventType: 'channel.order.shipping_summary.updated',
        eventVersion: 1,
        payload,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });

    await this.notificationProducer?.channelOrderShippingSummaryUpdated({
      tenantId,
      shippingSummaryId: summary.id,
      orderId,
      externalOrderId: order.externalOrderId,
      externalShipmentId: order.shipping.externalShipmentId ?? null,
      status: order.shipping.status ?? null,
      changedAt: summary.updatedAt,
    });
  }

  private async mapOrderItems(integration: ChannelIntegration, items: ChannelOrderItem[]) {
    if (!integration.defaultWarehouseId) {
      throw new BadRequestException('Channel integration default warehouse is required.');
    }

    if (items.length === 0) {
      throw new BadRequestException('Channel order has no processable items.');
    }

    const mappedItems: Array<{ skuId: string; warehouseId: string; quantity: number }> = [];
    for (const item of items) {
      const listing = await this.channelsRepository.findListingByExternalId({
        tenantId: integration.tenantId,
        integrationId: integration.id,
        externalListingId: item.externalListingId,
      });
      this.assertMappedListing(item.externalListingId, listing);

      mappedItems.push({
        skuId: listing.matchedSkuId,
        warehouseId: integration.defaultWarehouseId,
        quantity: item.quantity,
      });
    }

    return mappedItems;
  }

  private async applyOrderTransition(
    order: ChannelOrderDetails,
    orderId: string,
    tenantId: string,
    actorUserId: string,
    baseIdempotencyKey: string,
  ) {
    const status = order.status.toLowerCase();
    if (status === 'cancelled' || status === 'canceled') {
      return this.ordersService.cancel(orderId, tenantId, actorUserId, {
        reasonCode: 'CHANNEL_ORDER_CANCELLED',
        idempotencyKey: `${baseIdempotencyKey}:cancel`,
        notes: `Mercado Livre status ${order.status}`,
      });
    }

    if (status === 'delivered') {
      await this.ordersService.confirm(orderId, tenantId, actorUserId, {
        reasonCode: 'CHANNEL_ORDER_PAID',
        idempotencyKey: `${baseIdempotencyKey}:confirm`,
        notes: `Mercado Livre status ${order.status}`,
      });
      return this.ordersService.fulfill(orderId, tenantId, actorUserId, {
        reasonCode: 'CHANNEL_ORDER_DELIVERED',
        idempotencyKey: `${baseIdempotencyKey}:fulfill`,
        notes: `Mercado Livre status ${order.status}`,
      });
    }

    if (status === 'paid') {
      return this.ordersService.confirm(orderId, tenantId, actorUserId, {
        reasonCode: 'CHANNEL_ORDER_PAID',
        idempotencyKey: `${baseIdempotencyKey}:confirm`,
        notes: `Mercado Livre status ${order.status}`,
      });
    }

    return undefined;
  }

  private assertMappedListing(
    externalListingId: string,
    listing: ChannelListing | null,
  ): asserts listing is ChannelListing & { matchedSkuId: string } {
    if (
      !listing ||
      listing.matchStatus !== ChannelListingMatchStatus.MATCHED ||
      !listing.matchedSkuId
    ) {
      throw new BadRequestException(`Listing ${externalListingId} is not mapped to a SKU.`);
    }
  }

  private assertActiveIntegration(integration: ChannelIntegration) {
    if (integration.status !== ChannelIntegrationStatus.ACTIVE) {
      throw new BadRequestException('Channel integration is not active.');
    }
    if (!integration.encryptedCredentials) {
      throw new BadRequestException('Channel integration credentials are required.');
    }
  }

  private getAdapter(provider: ChannelProvider): ChannelOrderAdapter {
    if (provider === ChannelProvider.MERCADO_LIVRE) return this.mercadoLivreAdapter;

    throw new BadRequestException('Unsupported channel order adapter.');
  }

  private isOrderTopic(inboxEvent: ChannelWebhookInboxWithIntegration) {
    const topic = this.asString((inboxEvent.payloadSummary as PayloadSummary | null)?.topic);
    return inboxEvent.eventType.startsWith('orders') || topic.startsWith('orders');
  }

  private getResource(payloadSummary: unknown) {
    const resource = this.asString((payloadSummary as PayloadSummary | null)?.resource);
    if (!resource.startsWith('/orders/')) {
      throw new BadRequestException('Mercado Livre order resource is required.');
    }
    return resource;
  }

  private orderIdempotencyKey(
    provider: ChannelProvider,
    integrationId: string,
    order: ChannelOrderDetails,
  ) {
    return `channel:${provider}:integration-${integrationId.replace(/^integration-/, '')}:order:${order.externalOrderId}`;
  }

  private actorUserId(integrationId: string) {
    return `channel:${integrationId}`;
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toDate(value: string | undefined) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private shippingChanged(
    existing: {
      externalOrderId: string;
      externalShipmentId: string | null;
      status: string | null;
      substatus: string | null;
      shippingMode: string | null;
      logisticType: string | null;
      handlingEstimateAt: Date | null;
      deliveryEstimateAt: Date | null;
      postedAt: Date | null;
      trackingCodeMasked: string | null;
      source: string;
      confidence: number;
    },
    next: {
      externalOrderId: string;
      externalShipmentId?: string;
      status?: string;
      substatus?: string;
      shippingMode?: string;
      logisticType?: string;
      handlingEstimateAt?: Date;
      deliveryEstimateAt?: Date;
      postedAt?: Date;
      trackingCodeMasked?: string;
      source: string;
      confidence: number;
    },
  ) {
    return (
      existing.externalOrderId !== next.externalOrderId ||
      this.nullable(existing.externalShipmentId) !== this.nullable(next.externalShipmentId) ||
      this.nullable(existing.status) !== this.nullable(next.status) ||
      this.nullable(existing.substatus) !== this.nullable(next.substatus) ||
      this.nullable(existing.shippingMode) !== this.nullable(next.shippingMode) ||
      this.nullable(existing.logisticType) !== this.nullable(next.logisticType) ||
      this.dateValue(existing.handlingEstimateAt) !== this.dateValue(next.handlingEstimateAt) ||
      this.dateValue(existing.deliveryEstimateAt) !== this.dateValue(next.deliveryEstimateAt) ||
      this.dateValue(existing.postedAt) !== this.dateValue(next.postedAt) ||
      this.nullable(existing.trackingCodeMasked) !== this.nullable(next.trackingCodeMasked) ||
      existing.source !== next.source ||
      existing.confidence !== next.confidence
    );
  }

  private nullable(value: string | undefined | null) {
    return value ?? null;
  }

  private dateValue(value: Date | undefined | null) {
    return value?.toISOString() ?? null;
  }
}
