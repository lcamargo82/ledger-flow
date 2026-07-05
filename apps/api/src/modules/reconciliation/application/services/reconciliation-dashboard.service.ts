import { Injectable } from '@nestjs/common';
import { Prisma, ReconciliationCaseStatus, WebhookProvider } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ReconciliationDashboardQueryDto } from '../dto/reconciliation-dashboard-query.dto';

const PENDING_STATUSES = new Set<ReconciliationCaseStatus>([
  ReconciliationCaseStatus.PENDING,
  ReconciliationCaseStatus.AUTO_MATCHED,
  ReconciliationCaseStatus.UNMATCHED,
  ReconciliationCaseStatus.AMBIGUOUS,
]);

const DIVERGENT_STATUSES = new Set<ReconciliationCaseStatus>([
  ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
  ReconciliationCaseStatus.CURRENCY_DIVERGENCE,
  ReconciliationCaseStatus.STATUS_DIVERGENCE,
]);

type DashboardCase = {
  id: string;
  provider: WebhookProvider;
  status: ReconciliationCaseStatus;
  expectedAmountMinor: Prisma.Decimal | null;
  receivedAmountMinor: Prisma.Decimal | null;
  differenceAmountMinor: Prisma.Decimal | null;
  currency: string;
  createdAt: Date;
};

@Injectable()
export class ReconciliationDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string, query: ReconciliationDashboardQueryDto) {
    const cases = await this.prisma.reconciliationCase.findMany({
      where: this.buildWhere(tenantId, query),
      select: {
        id: true,
        provider: true,
        status: true,
        expectedAmountMinor: true,
        receivedAmountMinor: true,
        differenceAmountMinor: true,
        currency: true,
        createdAt: true,
      },
    });

    return {
      kpis: this.buildKpis(cases),
      byStatus: this.buildStatusBreakdown(cases),
      byProvider: this.buildProviderBreakdown(cases),
      agingBuckets: this.buildAgingBuckets(cases),
      note: 'cash_reconciliation_not_operational_margin',
    };
  }

  private buildWhere(
    tenantId: string,
    query: ReconciliationDashboardQueryDto,
  ): Prisma.ReconciliationCaseWhereInput {
    return {
      tenantId,
      ...(query.provider && { provider: query.provider }),
      ...(query.status && { status: query.status }),
      ...(query.currency && { currency: query.currency }),
      ...((query.dateFrom || query.dateTo) && {
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      }),
    };
  }

  private buildKpis(cases: DashboardCase[]) {
    let expectedAmountMinor = new Prisma.Decimal(0);
    let reconciledAmountMinor = new Prisma.Decimal(0);
    let pendingAmountMinor = new Prisma.Decimal(0);
    let divergentAmountMinor = new Prisma.Decimal(0);
    let reconciledCases = 0;
    let pendingCases = 0;
    let divergentCases = 0;

    for (const item of cases) {
      const expected = this.decimal(item.expectedAmountMinor);
      const received = this.decimal(item.receivedAmountMinor);
      const difference = this.decimal(item.differenceAmountMinor).absoluteValue();
      expectedAmountMinor = expectedAmountMinor.add(expected);

      if (item.status === ReconciliationCaseStatus.RECONCILED) {
        reconciledCases += 1;
        reconciledAmountMinor = reconciledAmountMinor.add(received);
      } else if (PENDING_STATUSES.has(item.status)) {
        pendingCases += 1;
        pendingAmountMinor = pendingAmountMinor.add(expected);
      } else if (DIVERGENT_STATUSES.has(item.status)) {
        divergentCases += 1;
        divergentAmountMinor = divergentAmountMinor.add(difference);
      }
    }

    return {
      expectedAmountMinor: expectedAmountMinor.toFixed(0),
      reconciledAmountMinor: reconciledAmountMinor.toFixed(0),
      pendingAmountMinor: pendingAmountMinor.toFixed(0),
      divergentAmountMinor: divergentAmountMinor.toFixed(0),
      totalCases: cases.length,
      reconciledCases,
      pendingCases,
      divergentCases,
    };
  }

  private buildStatusBreakdown(cases: DashboardCase[]) {
    const grouped = new Map<
      ReconciliationCaseStatus,
      { status: ReconciliationCaseStatus; count: number; amountMinor: Prisma.Decimal }
    >();

    for (const item of cases) {
      const current = grouped.get(item.status) ?? {
        status: item.status,
        count: 0,
        amountMinor: new Prisma.Decimal(0),
      };
      current.count += 1;
      current.amountMinor = current.amountMinor.add(this.decimal(item.expectedAmountMinor));
      grouped.set(item.status, current);
    }

    return [...grouped.values()].map((item) => ({
      status: item.status,
      count: item.count,
      amountMinor: item.amountMinor.toFixed(0),
    }));
  }

  private buildProviderBreakdown(cases: DashboardCase[]) {
    const grouped = new Map<
      WebhookProvider,
      {
        provider: WebhookProvider;
        count: number;
        expectedAmountMinor: Prisma.Decimal;
        receivedAmountMinor: Prisma.Decimal;
      }
    >();

    for (const item of cases) {
      const current = grouped.get(item.provider) ?? {
        provider: item.provider,
        count: 0,
        expectedAmountMinor: new Prisma.Decimal(0),
        receivedAmountMinor: new Prisma.Decimal(0),
      };
      current.count += 1;
      current.expectedAmountMinor = current.expectedAmountMinor.add(
        this.decimal(item.expectedAmountMinor),
      );
      current.receivedAmountMinor = current.receivedAmountMinor.add(
        this.decimal(item.receivedAmountMinor),
      );
      grouped.set(item.provider, current);
    }

    return [...grouped.values()].map((item) => ({
      provider: item.provider,
      count: item.count,
      expectedAmountMinor: item.expectedAmountMinor.toFixed(0),
      receivedAmountMinor: item.receivedAmountMinor.toFixed(0),
    }));
  }

  private buildAgingBuckets(cases: DashboardCase[]) {
    const buckets = [
      { key: '0_1', label: '0-1d', min: 0, max: 1, count: 0, amountMinor: new Prisma.Decimal(0) },
      { key: '2_3', label: '2-3d', min: 2, max: 3, count: 0, amountMinor: new Prisma.Decimal(0) },
      { key: '4_7', label: '4-7d', min: 4, max: 7, count: 0, amountMinor: new Prisma.Decimal(0) },
      {
        key: '8_plus',
        label: '8+d',
        min: 8,
        max: Infinity,
        count: 0,
        amountMinor: new Prisma.Decimal(0),
      },
    ];
    const now = Date.now();

    for (const item of cases) {
      if (item.status === ReconciliationCaseStatus.RECONCILED) continue;

      const ageDays = Math.floor((now - item.createdAt.getTime()) / 86_400_000);
      const bucket = buckets.find(
        (candidate) => ageDays >= candidate.min && ageDays <= candidate.max,
      );
      if (!bucket) continue;

      bucket.count += 1;
      bucket.amountMinor = bucket.amountMinor.add(this.decimal(item.expectedAmountMinor));
    }

    return buckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      count: bucket.count,
      amountMinor: bucket.amountMinor.toFixed(0),
    }));
  }

  private decimal(value: Prisma.Decimal | null | undefined) {
    return value ? new Prisma.Decimal(value) : new Prisma.Decimal(0);
  }
}
