import { Injectable } from '@nestjs/common';
import { Prisma, WebhookProvider } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  ReconciliationProviderAdapter,
  SyncInput,
} from '../../domain/interfaces/reconciliation-provider-adapter.interface';
import { ReconciliationSettlementIngestionService } from './reconciliation-settlement-ingestion.service';

interface SyncOptions {
  from?: Date;
  to?: Date;
  maxPages?: number;
  delayMs?: number;
  jitterSeed?: number;
  failureThreshold?: number;
  circuitOpenSeconds?: number;
}

export interface ReconciliationSyncResult {
  provider: WebhookProvider;
  pagesFetched: number;
  received: number;
  created: number;
  duplicates: number;
  circuitOpened: boolean;
  nextAttemptAt: Date | null;
}

@Injectable()
export class ReconciliationSyncService {
  constructor(
    private readonly ingestion: ReconciliationSettlementIngestionService,
    private readonly prisma: PrismaService,
  ) {}

  async syncProvider(
    tenantId: string,
    actorUserId: string,
    adapter: ReconciliationProviderAdapter,
    options: SyncOptions = {},
  ): Promise<ReconciliationSyncResult> {
    if (!adapter.supportsSettlementSync()) {
      const result = this.emptyCircuitResult(adapter.provider, options);
      await this.audit(tenantId, actorUserId, 'reconciliation.sync.unsupported', result);
      return result;
    }

    const maxPages = options.maxPages ?? 5;
    const failureThreshold = options.failureThreshold ?? 3;
    let cursor: string | undefined;
    let consecutiveFailures = 0;
    const result: ReconciliationSyncResult = {
      provider: adapter.provider,
      pagesFetched: 0,
      received: 0,
      created: 0,
      duplicates: 0,
      circuitOpened: false,
      nextAttemptAt: null,
    };

    while (result.pagesFetched < maxPages) {
      try {
        const input: SyncInput = {
          tenantId,
          cursor,
          from: options.from,
          to: options.to,
        };
        const page = await adapter.fetchSettlements(input);
        consecutiveFailures = 0;
        result.pagesFetched += 1;
        result.received += page.data.length;

        for (const item of page.data) {
          const ingested = await this.ingestion.ingestNormalizedSettlement(tenantId, item);
          if (ingested.created) result.created += 1;
          else result.duplicates += 1;
        }

        if (!page.nextCursor) break;
        cursor = page.nextCursor;
        await this.wait(
          this.jitteredDelay(options.delayMs ?? 250, options.jitterSeed ?? result.pagesFetched),
        );
      } catch (error) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= failureThreshold) {
          result.circuitOpened = true;
          result.nextAttemptAt = this.addSeconds(new Date(), options.circuitOpenSeconds ?? 300);
          await this.audit(tenantId, actorUserId, 'reconciliation.sync.circuit_opened', {
            ...result,
            errorSummary: error instanceof Error ? error.message : 'Unknown sync failure.',
          });
          return result;
        }
      }
    }

    await this.audit(tenantId, actorUserId, 'reconciliation.sync.completed', result);
    await this.outbox(tenantId, adapter.provider, result);
    return result;
  }

  private emptyCircuitResult(
    provider: WebhookProvider,
    options: SyncOptions,
  ): ReconciliationSyncResult {
    return {
      provider,
      pagesFetched: 0,
      received: 0,
      created: 0,
      duplicates: 0,
      circuitOpened: true,
      nextAttemptAt: this.addSeconds(new Date(), options.circuitOpenSeconds ?? 300),
    };
  }

  private jitteredDelay(delayMs: number, seed: number) {
    const jitter = (seed % 5) * 25;
    return delayMs + jitter;
  }

  private wait(_ms: number) {
    return Promise.resolve();
  }

  private addSeconds(date: Date, seconds: number) {
    return new Date(date.getTime() + seconds * 1000);
  }

  private async audit(
    tenantId: string,
    actorUserId: string,
    action: string,
    metadata: ReconciliationSyncResult | (Record<string, unknown> & { provider: WebhookProvider }),
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'ReconciliationSync',
        entityId: String(metadata.provider),
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private async outbox(
    tenantId: string,
    provider: WebhookProvider,
    result: ReconciliationSyncResult,
  ) {
    const payload = {
      provider,
      pagesFetched: result.pagesFetched,
      received: result.received,
      created: result.created,
      duplicates: result.duplicates,
    };
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'ReconciliationSync',
        aggregateId: provider,
        eventType: 'reconciliation.sync.completed',
        eventVersion: 1,
        payload: payload,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
  }
}
