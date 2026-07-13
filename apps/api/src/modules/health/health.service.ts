import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ExportJobStatus,
  ExportJobType,
  NotificationWebhookDeliveryStatus,
  ReconciliationCaseStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'ledgerflow-api',
      timestamp: new Date().toISOString(),
    };
  }

  getLiveness() {
    return {
      status: 'ok',
      check: 'liveness',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        check: 'readiness',
        database: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        check: 'readiness',
        database: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getSettlementHealth() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [settlementEventsLast24h, openDivergenceCases, webhookDeliveriesInDlq, failedExports] =
      await Promise.all([
        this.prisma.providerSettlementEvent.count({
          where: { createdAt: { gte: since } },
        }),
        this.prisma.reconciliationCase.count({
          where: {
            status: {
              in: [
                ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
                ReconciliationCaseStatus.CURRENCY_DIVERGENCE,
                ReconciliationCaseStatus.STATUS_DIVERGENCE,
              ],
            },
          },
        }),
        this.prisma.notificationWebhookDelivery.count({
          where: { status: NotificationWebhookDeliveryStatus.DLQ },
        }),
        this.prisma.exportJob.count({
          where: {
            type: {
              in: [ExportJobType.RECONCILIATION_CASES, ExportJobType.MARKETPLACE_SETTLEMENT_EVENTS],
            },
            status: ExportJobStatus.FAILED,
          },
        }),
      ]);

    const status =
      webhookDeliveriesInDlq > 0 || failedExports > 0
        ? 'degraded'
        : openDivergenceCases > 0
          ? 'attention'
          : 'ok';

    return {
      status,
      check: 'marketplace-settlement',
      window: '24h',
      settlementEventsLast24h,
      openDivergenceCases,
      webhookDeliveriesInDlq,
      failedExports,
      sanitized: true,
      timestamp: new Date().toISOString(),
    };
  }
}
