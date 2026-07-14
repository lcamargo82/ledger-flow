import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ListSalesIntelligenceQueryDto } from '../dto/list-sales-intelligence-query.dto';
import { SalesIntelligenceRowDto } from '../dto/sales-intelligence-response.dto';
import {
  SalesIntelligenceNetAmountSource,
  SalesIntelligenceStockStatus,
} from '../../domain/enums/sales-intelligence.enums';
import {
  buildSalesIntelligenceWhere,
  salesIntelligenceOrderSelect,
} from './sales-intelligence.query';
import { mapSalesIntelligenceOrder } from './sales-intelligence.mapper';

interface SummaryAccumulator {
  orderCount: number;
  paid: bigint;
  fee: bigint;
  net: bigint;
  realized: bigint;
  reconciled: bigint;
  estimated: bigint;
  stockIssues: number;
  currency: string;
}

@Injectable()
export class SalesIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(tenantId: string, query: ListSalesIntelligenceQueryDto) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 20, 100);
    const where = buildSalesIntelligenceWhere(tenantId, query);
    const [orders, total] = await Promise.all([
      this.prisma.internalOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: salesIntelligenceOrderSelect,
      }),
      this.prisma.internalOrder.count({ where }),
    ]);

    return {
      data: orders.map((order) => mapSalesIntelligenceOrder(order, this.now)),
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }

  async getSummary(tenantId: string, query: ListSalesIntelligenceQueryDto = {}) {
    const summary = this.emptySummary();
    const batchSize = 500;
    const where = buildSalesIntelligenceWhere(tenantId, query);

    for (let skip = 0; ; skip += batchSize) {
      const orders = await this.prisma.internalOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: batchSize,
        select: salesIntelligenceOrderSelect,
      });
      orders
        .map((order) => mapSalesIntelligenceOrder(order, this.now))
        .forEach((row) => this.addToSummary(summary, row));
      if (orders.length < batchSize) break;
    }

    return this.serializeSummary(summary);
  }

  private addToSummary(summary: SummaryAccumulator, row: SalesIntelligenceRowDto) {
    summary.orderCount += 1;
    summary.paid += this.minor(row.paidAmountMinor);
    summary.fee += this.minor(row.feeAmountMinor);
    summary.net += this.minor(row.netAmountMinor);
    if (row.netAmountSource === SalesIntelligenceNetAmountSource.REALIZED) {
      summary.realized += this.minor(row.netAmountMinor);
    }
    if (row.netAmountSource === SalesIntelligenceNetAmountSource.RECONCILED) {
      summary.reconciled += this.minor(row.netAmountMinor);
    }
    if (row.netAmountSource === SalesIntelligenceNetAmountSource.ESTIMATED) {
      summary.estimated += this.minor(row.netAmountMinor);
    }
    if (row.stockStatus === SalesIntelligenceStockStatus.DIVERGENT) summary.stockIssues += 1;
    summary.currency = row.currency;
  }

  private serializeSummary(summary: SummaryAccumulator) {
    return {
      orderCount: summary.orderCount,
      paidAmountMinor: summary.paid.toString(),
      feeAmountMinor: summary.fee.toString(),
      netAmountMinor: summary.net.toString(),
      realizedNetAmountMinor: summary.realized.toString(),
      reconciledNetAmountMinor: summary.reconciled.toString(),
      estimatedNetAmountMinor: summary.estimated.toString(),
      stockIssueCount: summary.stockIssues,
      currency: summary.currency,
    };
  }

  private emptySummary(): SummaryAccumulator {
    return {
      orderCount: 0,
      paid: 0n,
      fee: 0n,
      net: 0n,
      realized: 0n,
      reconciled: 0n,
      estimated: 0n,
      stockIssues: 0,
      currency: 'BRL',
    };
  }

  private minor(value: string | null | undefined) {
    return BigInt(value ?? 0);
  }
}
