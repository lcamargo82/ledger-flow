import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  Payment,
  PaymentExecutionMode,
  PaymentStatus,
  OutboxEvent,
  AsyncJobExecution,
  GatewayConfiguration,
} from '@prisma/client';

export type PaymentExternalProcessingStatus =
  | 'NOT_REQUIRED'
  | 'NOT_STARTED'
  | 'PROCESSING'
  | 'RETRY_SCHEDULED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'DEAD_LETTERED';

export interface PaymentExternalProcessing {
  status: PaymentExternalProcessingStatus;
  retryAvailable: boolean;
  messageKey: string;
  lastUpdatedAt: string;
}

@Injectable()
export class PaymentsExternalProcessingService {
  constructor(private readonly prisma: PrismaService) {}

  async enrichMany(
    tenantId: string,
    payments: Payment[],
  ): Promise<(Payment & { externalProcessing: PaymentExternalProcessing })[]> {
    if (!payments.length) return [];

    const paymentIds = payments
      .filter(
        (p) =>
          p.executionMode === PaymentExecutionMode.EXTERNAL_GATEWAY &&
          !p.providerPaymentId,
      )
      .map((p) => p.id);

    const gatewayConfigIds = Array.from(
      new Set(payments.map((p) => p.gatewayConfigurationId).filter(Boolean)),
    ) as string[];

    const [outboxEvents, gatewayConfigs] = await Promise.all([
      paymentIds.length
        ? this.prisma.outboxEvent.findMany({
            where: {
              aggregateId: { in: paymentIds },
              aggregateType: 'Payment',
              eventType: 'payment.provider_charge_creation_requested',
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve<OutboxEvent[]>([]),
      gatewayConfigIds.length
        ? this.prisma.gatewayConfiguration.findMany({
            where: { id: { in: gatewayConfigIds } },
          })
        : Promise.resolve<GatewayConfiguration[]>([]),
    ]);

    const latestOutboxPerPayment = new Map<string, OutboxEvent>();
    for (const outbox of outboxEvents) {
      if (!latestOutboxPerPayment.has(outbox.aggregateId)) {
        latestOutboxPerPayment.set(outbox.aggregateId, outbox);
      }
    }

    const outboxIds = Array.from(latestOutboxPerPayment.values()).map(
      (o) => o.id,
    );

    const jobs = outboxIds.length
      ? await this.prisma.asyncJobExecution.findMany({
          where: { outboxEventId: { in: outboxIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const latestJobPerOutbox = new Map<string, AsyncJobExecution>();
    for (const job of jobs) {
      if (!latestJobPerOutbox.has(job.outboxEventId)) {
        latestJobPerOutbox.set(job.outboxEventId, job);
      }
    }

    const configsMap = new Map<string, GatewayConfiguration>(
      gatewayConfigs.map((c) => [c.id, c]),
    );

    return payments.map((payment) => {
      if (payment.executionMode !== PaymentExecutionMode.EXTERNAL_GATEWAY) {
        return {
          ...payment,
          externalProcessing: {
            status: 'NOT_REQUIRED',
            retryAvailable: false,
            messageKey: 'payments.externalProcessing.status.NOT_REQUIRED',
            lastUpdatedAt: payment.updatedAt.toISOString(),
          },
        };
      }

      if (payment.providerPaymentId) {
        return {
          ...payment,
          externalProcessing: {
            status: 'SUCCEEDED',
            retryAvailable: false,
            messageKey: 'payments.externalProcessing.message.succeeded',
            lastUpdatedAt: payment.updatedAt.toISOString(),
          },
        };
      }

      const outbox = latestOutboxPerPayment.get(payment.id);
      if (!outbox) {
        return {
          ...payment,
          externalProcessing: {
            status: 'NOT_STARTED',
            retryAvailable: false,
            messageKey: 'payments.externalProcessing.status.NOT_STARTED',
            lastUpdatedAt: payment.updatedAt.toISOString(),
          },
        };
      }

      const job = latestJobPerOutbox.get(outbox.id);

      let status: PaymentExternalProcessingStatus = 'PROCESSING';
      let retryAvailable = false;
      let messageKey = 'payments.externalProcessing.message.processing';
      const lastUpdatedAt = (job?.updatedAt || outbox.updatedAt).toISOString();

      if (job) {
        if (job.status === 'SUCCEEDED') {
          status = 'SUCCEEDED';
          messageKey = 'payments.externalProcessing.message.succeeded';
        } else if (job.status === 'RETRY_SCHEDULED') {
          status = 'RETRY_SCHEDULED';
          messageKey = 'payments.externalProcessing.message.retryScheduled';
        } else if (job.status === 'DEAD_LETTERED' || job.status === 'FAILED') {
          status = job.status;
          messageKey = this.mapErrorMessage(job.lastErrorSummary);
          retryAvailable = this.isRetryEligible(payment, configsMap);
        }
      } else if (outbox.status === 'CANCELED') {
        status = 'DEAD_LETTERED';
        messageKey = 'payments.externalProcessing.message.failed';
        retryAvailable = this.isRetryEligible(payment, configsMap);
      }

      return {
        ...payment,
        externalProcessing: {
          status,
          retryAvailable,
          messageKey,
          lastUpdatedAt,
        },
      };
    });
  }

  private isRetryEligible(
    payment: Payment,
    configsMap: Map<string, GatewayConfiguration>,
  ): boolean {
    if (payment.providerPaymentId) return false;
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.PROCESSING
    )
      return false;
    if (payment.executionMode !== PaymentExecutionMode.EXTERNAL_GATEWAY)
      return false;

    if (!payment.gatewayConfigurationId) return false;
    const config = configsMap.get(payment.gatewayConfigurationId);
    if (!config || config.status !== 'ACTIVE') return false;

    return true;
  }

  private mapErrorMessage(errorSummary?: string | null): string {
    if (!errorSummary) return 'payments.externalProcessing.message.failed';

    const summary = errorSummary.toLowerCase();
    if (
      summary.includes('credentials') ||
      summary.includes('unauthorized') ||
      summary.includes('invalid api key')
    ) {
      return 'payments.externalProcessing.message.credentialInvalid';
    }
    if (summary.includes('not configured')) {
      return 'payments.externalProcessing.message.gatewayNotConfigured';
    }
    if (summary.includes('not supported')) {
      return 'payments.externalProcessing.message.methodNotSupported';
    }
    if (summary.includes('environment')) {
      return 'payments.externalProcessing.message.environmentNotAllowed';
    }
    if (
      summary.includes('temporarily unavailable') ||
      summary.includes('timeout') ||
      summary.includes('econnrefused')
    ) {
      return 'payments.externalProcessing.message.providerUnavailable';
    }
    if (summary.includes('rate limit') || summary.includes('429')) {
      return 'payments.externalProcessing.message.providerUnavailable'; // Can map to rate limited if we add it
    }
    return 'payments.externalProcessing.message.failed';
  }
}
