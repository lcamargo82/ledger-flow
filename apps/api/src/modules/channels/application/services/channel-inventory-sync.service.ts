import { Inject, Injectable } from '@nestjs/common';
import {
  ChannelIntegration,
  ChannelIntegrationStatus,
  ChannelInventorySyncState,
  ChannelProvider,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { GatewayCredentialsEncryptionService } from '../../../gateways/application/services/gateway-credentials-encryption.service';
import { MercadoLivreChannelAdapter } from '../../infra/adapters/mercado-livre-channel.adapter';
import { CHANNELS_REPOSITORY } from '../../domain/repositories/channels.repository';
import type { ChannelsRepository } from '../../domain/repositories/channels.repository';
import { MercadoLivreCredentialsService } from './mercado-livre-credentials.service';
import { NotificationProducerService } from '../../../notifications/application/services/notification-producer.service';

export interface InventoryBalanceChangedInput {
  tenantId: string;
  skuId: string;
  availableQuantity: number;
  balanceId: string;
}

@Injectable()
export class ChannelInventorySyncService {
  private readonly maxAttemptsBeforeCircuit = 3;

  constructor(
    @Inject(CHANNELS_REPOSITORY)
    private readonly channelsRepository: ChannelsRepository,
    private readonly prisma: PrismaService,
    private readonly mercadoLivreAdapter?: MercadoLivreChannelAdapter,
    private readonly credentialsEncryptionService?: GatewayCredentialsEncryptionService,
    private readonly mercadoLivreCredentialsService?: MercadoLivreCredentialsService,
    private readonly notificationProducer?: NotificationProducerService,
  ) {}

  listStatus(
    tenantId: string,
    query: {
      page?: number;
      perPage?: number;
      provider?: ChannelProvider;
      status?: string;
    },
  ) {
    return this.channelsRepository.listInventorySyncStates({
      tenantId,
      page: query.page,
      perPage: query.perPage,
      provider: query.provider,
      status: query.status as never,
    });
  }

  async enqueueBalanceChanged(input: InventoryBalanceChangedInput) {
    const listings = await this.channelsRepository.findSyncableListingsBySku(
      input.tenantId,
      input.skuId,
    );
    const states: ChannelInventorySyncState[] = [];
    const scheduledUserProducts = new Set<string>();

    for (const listing of listings) {
      if (!listing.matchedSkuId) continue;
      const userProductKey = listing.externalUserProductId
        ? `${listing.integrationId}:${listing.externalUserProductId}`
        : null;
      if (userProductKey && scheduledUserProducts.has(userProductKey)) continue;
      if (userProductKey) scheduledUserProducts.add(userProductKey);

      const state = await this.channelsRepository.upsertInventorySyncState({
        tenantId: input.tenantId,
        listingId: listing.id,
        integrationId: listing.integrationId,
        provider: listing.provider,
        externalListingId: listing.externalListingId,
        skuId: listing.matchedSkuId,
        targetAvailableQuantity: input.availableQuantity,
      });

      await this.createOutbox(input.tenantId, listing.id, 'channel.inventory_sync.requested', {
        listingId: listing.id,
        skuId: listing.matchedSkuId,
        balanceId: input.balanceId,
        provider: listing.provider,
        targetAvailableQuantity: input.availableQuantity,
      });

      states.push(state);
    }

    return { requested: states.length, data: states };
  }

  async processPending(tenantId: string, limit = 25) {
    const now = new Date();
    const pendingStates = await this.channelsRepository.findPendingInventorySyncStates({
      tenantId,
      limit,
      now,
    });

    const summary = { processed: 0, synced: 0, retryScheduled: 0, circuitOpened: 0 };
    for (const state of pendingStates) {
      summary.processed += 1;
      const quantity = Number(state.targetAvailableQuantity);
      const result = await this.providerSync(state, quantity, tenantId);

      if (result.ok) {
        await this.channelsRepository.markInventorySyncSuccess({
          id: state.id,
          quantity,
          now,
        });
        await this.createOutbox(tenantId, state.id, 'channel.inventory_sync.completed', {
          listingId: state.listingId,
          skuId: state.skuId,
          provider: state.provider,
          targetAvailableQuantity: quantity,
        });
        summary.synced += 1;
        continue;
      }

      if (
        result.errorCode === 'INTEGRATION_NOT_SYNCABLE' ||
        result.errorCode === 'WAREHOUSE_MAPPING_REQUIRED' ||
        result.errorCode === 'WAREHOUSE_MAPPING_INVALID' ||
        state.attemptCount + 1 >= this.maxAttemptsBeforeCircuit
      ) {
        await this.notificationProducer?.channelInventorySyncFailed({
          tenantId,
          syncStateId: state.id,
          listingId: state.listingId,
          attempt: state.attemptCount + 1,
        });
        await this.channelsRepository.markInventorySyncCircuitOpen({
          id: state.id,
          circuitOpenedUntil: this.addSeconds(now, 300),
          errorCode: result.errorCode,
          errorSummary: result.errorSummary,
        });
        summary.circuitOpened += 1;
        continue;
      }

      await this.channelsRepository.markInventorySyncRetry({
        id: state.id,
        nextAttemptAt: this.addSeconds(
          now,
          result.retryAfterSeconds ?? this.backoffSeconds(state.attemptCount),
        ),
        errorCode: result.errorCode,
        errorSummary: result.errorSummary,
      });
      summary.retryScheduled += 1;
    }

    return summary;
  }

  private async providerSync(
    state: ChannelInventorySyncState,
    quantity: number,
    tenantId: string,
  ): Promise<
    | { ok: true }
    | { ok: false; errorCode: string; errorSummary: string; retryAfterSeconds?: number }
  > {
    if (state.provider === ChannelProvider.MOCK) {
      return this.mockProviderSync(state);
    }

    if (state.provider === ChannelProvider.MERCADO_LIVRE) {
      return this.mercadoLivreProviderSync(state, quantity, tenantId);
    }

    return {
      ok: false,
      errorCode: 'PROVIDER_NOT_SUPPORTED',
      errorSummary: 'Provider is not supported for egress inventory sync.',
    };
  }

  private mockProviderSync(
    state: ChannelInventorySyncState,
  ): { ok: true } | { ok: false; errorCode: string; errorSummary: string } {
    if (state.externalListingId.includes('rate-limit')) {
      return {
        ok: false,
        errorCode: 'PROVIDER_RATE_LIMIT',
        errorSummary: 'Mock provider returned 429.',
      };
    }

    return { ok: true };
  }

  private async mercadoLivreProviderSync(
    state: ChannelInventorySyncState,
    quantity: number,
    tenantId: string,
  ): Promise<
    | { ok: true }
    | { ok: false; errorCode: string; errorSummary: string; retryAfterSeconds?: number }
  > {
    if (!this.mercadoLivreAdapter || !this.credentialsEncryptionService) {
      return {
        ok: false as const,
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        errorSummary: 'Mercado Livre inventory sync is not configured.',
      };
    }

    const integration = await this.channelsRepository.findIntegrationById(
      state.integrationId,
      tenantId,
    );
    const syncableFailure = this.integrationSyncableFailure(integration);
    if (syncableFailure) return syncableFailure;
    if (!integration) {
      return {
        ok: false,
        errorCode: 'INTEGRATION_NOT_SYNCABLE',
        errorSummary: 'Channel integration is not active for inventory sync.',
      };
    }

    const accessToken = this.mercadoLivreCredentialsService
      ? await this.mercadoLivreCredentialsService.getAccessToken(integration)
      : this.credentialsEncryptionService.decrypt(JSON.stringify(integration.encryptedCredentials))
          .accessToken;
    if (!accessToken) {
      return {
        ok: false as const,
        errorCode: 'CREDENTIALS_NOT_SYNCABLE',
        errorSummary: 'Mercado Livre access token is unavailable.',
      };
    }

    const listing = await this.channelsRepository.findListingById(state.listingId, tenantId);
    if (!listing) {
      return {
        ok: false as const,
        errorCode: 'LISTING_NOT_FOUND',
        errorSummary: 'Mapped channel listing was not found.',
      };
    }
    const settings = this.asRecord(integration.settingsJson);
    const storeId = this.asOptionalString(settings.mercadoLivreWarehouseStoreId);
    const networkNodeId = this.asOptionalString(settings.mercadoLivreWarehouseNetworkNodeId);

    return this.mercadoLivreAdapter.updateListingStock({
      accessToken,
      externalListingId: state.externalListingId,
      externalUserProductId: listing.externalUserProductId,
      sellerWarehouseLocation: storeId && networkNodeId ? { storeId, networkNodeId } : null,
      availableQuantity: quantity,
    });
  }

  private integrationSyncableFailure(integration: ChannelIntegration | null) {
    if (!integration || integration.status !== ChannelIntegrationStatus.ACTIVE) {
      return {
        ok: false as const,
        errorCode: 'INTEGRATION_NOT_SYNCABLE',
        errorSummary: 'Channel integration is not active for inventory sync.',
      };
    }

    if (!integration.encryptedCredentials) {
      return {
        ok: false as const,
        errorCode: 'CREDENTIALS_NOT_SYNCABLE',
        errorSummary: 'Channel integration credentials are unavailable.',
      };
    }

    return null;
  }

  private backoffSeconds(attemptCount: number) {
    const base = Math.min(60, 5 * 2 ** attemptCount);
    const jitter = (attemptCount % 3) + 1;
    return base + jitter;
  }

  private addSeconds(date: Date, seconds: number) {
    return new Date(date.getTime() + seconds * 1000);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asOptionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
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
        aggregateType: 'ChannelInventorySyncState',
        aggregateId,
        eventType,
        eventVersion: 1,
        payload: payload as Prisma.InputJsonValue,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
  }
}
