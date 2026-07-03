import { Inject, Injectable } from '@nestjs/common';
import { ChannelInventorySyncState, ChannelProvider, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CHANNELS_REPOSITORY } from '../../domain/repositories/channels.repository';
import type { ChannelsRepository } from '../../domain/repositories/channels.repository';

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

    for (const listing of listings) {
      if (!listing.matchedSkuId) continue;

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
      const result = this.mockProviderSync(state);

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

      if (state.attemptCount + 1 >= this.maxAttemptsBeforeCircuit) {
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
        nextAttemptAt: this.addSeconds(now, this.backoffSeconds(state.attemptCount)),
        errorCode: result.errorCode,
        errorSummary: result.errorSummary,
      });
      summary.retryScheduled += 1;
    }

    return summary;
  }

  private mockProviderSync(state: ChannelInventorySyncState):
    | { ok: true }
    | { ok: false; errorCode: string; errorSummary: string } {
    if (state.provider !== ChannelProvider.MOCK) {
      return {
        ok: false,
        errorCode: 'PROVIDER_NOT_SUPPORTED',
        errorSummary: 'Only MOCK provider is supported for egress sync in 10.0.8.',
      };
    }

    if (state.externalListingId.includes('rate-limit')) {
      return {
        ok: false,
        errorCode: 'PROVIDER_RATE_LIMIT',
        errorSummary: 'Mock provider returned 429.',
      };
    }

    return { ok: true };
  }

  private backoffSeconds(attemptCount: number) {
    const base = Math.min(60, 5 * 2 ** attemptCount);
    const jitter = (attemptCount % 3) + 1;
    return base + jitter;
  }

  private addSeconds(date: Date, seconds: number) {
    return new Date(date.getTime() + seconds * 1000);
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
