import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { OperationalFinancialAccountStatus, PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { MarketplaceFinancialIngestionService } from './marketplace-financial-ingestion.service';

@Injectable()
export class MarketplaceSettlementAutoSyncWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MarketplaceSettlementAutoSyncWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private isRunning = false;

  private readonly intervalMs = this.numberFromEnv(
    'MARKETPLACE_SETTLEMENT_AUTO_SYNC_INTERVAL_MS',
    5 * 60 * 1000,
  );
  private readonly initialDelayMs = this.numberFromEnv(
    'MARKETPLACE_SETTLEMENT_AUTO_SYNC_INITIAL_DELAY_MS',
    15 * 1000,
  );
  private readonly lookbackMinutes = this.numberFromEnv(
    'MARKETPLACE_SETTLEMENT_AUTO_SYNC_LOOKBACK_MINUTES',
    48 * 60,
  );
  private readonly maxPages = this.numberFromEnv('MARKETPLACE_SETTLEMENT_AUTO_SYNC_MAX_PAGES', 3);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestionService: MarketplaceFinancialIngestionService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.APP_PROCESS_ROLE !== 'worker') {
      this.logger.log('marketplace.settlement.auto_sync skipped (APP_PROCESS_ROLE != worker)');
      return;
    }

    if (process.env.MARKETPLACE_SETTLEMENT_AUTO_SYNC_ENABLED === 'false') {
      this.logger.log('marketplace.settlement.auto_sync disabled');
      return;
    }

    if (this.intervalMs <= 0 || this.lookbackMinutes <= 0 || this.maxPages <= 0) {
      this.logger.warn('marketplace.settlement.auto_sync skipped due to invalid configuration');
      return;
    }

    this.logger.log(
      `marketplace.settlement.auto_sync.started intervalMs=${this.intervalMs} lookbackMinutes=${this.lookbackMinutes} maxPages=${this.maxPages}`,
    );
    this.schedule(this.initialDelayMs);
  }

  onApplicationShutdown() {
    this.isShuttingDown = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  async runOnce(now = new Date()) {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const accounts = await this.prisma.operationalFinancialAccount.findMany({
        where: {
          provider: PaymentProvider.MERCADO_PAGO,
          status: OperationalFinancialAccountStatus.ACTIVE,
        },
        select: {
          id: true,
          tenantId: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (accounts.length === 0) {
        this.logger.debug('marketplace.settlement.auto_sync.no_accounts');
        return;
      }

      const to = now;
      const from = new Date(to.getTime() - this.lookbackMinutes * 60 * 1000);

      for (const account of accounts) {
        try {
          const result = await this.ingestionService.syncMercadoPagoByPeriod(
            account.tenantId,
            null,
            account.id,
            {
              from: from.toISOString(),
              to: to.toISOString(),
              maxPages: this.maxPages,
            },
          );
          this.logger.log(
            `marketplace.settlement.auto_sync.account_done accountId=${account.id} received=${result.received} created=${result.created} updated=${result.updated} duplicates=${result.duplicates}`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `marketplace.settlement.auto_sync.account_failed accountId=${account.id}: ${message}`,
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  private schedule(delayMs: number) {
    this.timer = setTimeout(async () => {
      if (this.isShuttingDown) return;

      await this.runOnce();
      if (!this.isShuttingDown) {
        this.schedule(this.intervalMs);
      }
    }, delayMs);
  }

  private numberFromEnv(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) ? value : fallback;
  }
}
