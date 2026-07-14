import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ChannelProvider, InternalOrderStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ListOrderFinancialFactsQueryDto } from '../dto/list-order-financial-facts-query.dto';

@Injectable()
export class FinancialIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async createChannelOrderOperationalFact(
    orderId: string,
    tenantId: string,
    actorUserId: string | undefined,
    input: {
      provider: ChannelProvider;
      externalOrderId: string;
      currency?: string;
      paymentStatus?: string;
      soldAt?: string;
      revenueAmount?: string;
      paidAmount?: string;
      channelFeeAmount?: string;
      estimatedNetAmount?: string;
      freightAmount?: string;
      discountAmount?: string;
    },
  ) {
    const normalizedFinancial = this.normalizeChannelFinancialInput(input);
    const financialSignature = createHash('sha256')
      .update(JSON.stringify(normalizedFinancial))
      .digest('hex');
    const existingFact = await this.prisma.orderFinancialFact.findFirst({
      where: { tenantId, orderId, financialSignature, isCurrent: true },
    });
    if (existingFact) return existingFact;

    const order = await this.findOrderWithSku(orderId, tenantId);
    const revenueAmount = this.decimal(input.revenueAmount);
    const paidAmount = this.optionalDecimal(input.paidAmount);
    const channelFeeAmount = this.decimal(input.channelFeeAmount);
    const estimatedNetAmount = this.optionalDecimal(input.estimatedNetAmount);
    const freightAmount = this.decimal(input.freightAmount);
    const discountAmount = this.decimal(input.discountAmount);
    const { cogsAmount, items, currency } = this.calculateCogs(order.items, input.currency);
    const grossMarginAmount = revenueAmount.sub(cogsAmount).sub(channelFeeAmount);
    const components = {
      note: 'Operational marketplace financial fact only. This is not payment settlement or reconciliation.',
      provider: input.provider,
      externalOrderId: input.externalOrderId,
      revenue: {
        source: 'Provider order detail when available',
        amount: revenueAmount.toString(),
      },
      cogs: {
        source: 'ProductSku.averageCost snapshot at operational fact creation',
        amount: cogsAmount.toString(),
      },
      channelFees: {
        source: 'Provider order detail when available',
        amount: channelFeeAmount.toString(),
        provided: input.channelFeeAmount !== undefined,
      },
      payment: {
        status: input.paymentStatus ?? null,
        paidAmount: paidAmount?.toString() ?? null,
        estimatedNetAmount: estimatedNetAmount?.toString() ?? null,
      },
      freight: {
        source: 'Provider order detail when available',
        amount: freightAmount.toString(),
      },
      discounts: {
        source: 'Provider order detail when available',
        amount: discountAmount.toString(),
      },
      marginFormula: 'revenueAmount - cogsAmount - channelFeeAmount',
      items,
    };

    const fact = await this.prisma.$transaction(
      async (transaction) => {
        const latestVersion = await transaction.orderFinancialFact.aggregate({
          where: { tenantId, orderId },
          _max: { version: true },
        });
        await transaction.orderFinancialFact.updateMany({
          where: { tenantId, orderId, isCurrent: true },
          data: { isCurrent: false },
        });
        return transaction.orderFinancialFact.create({
          data: {
            tenantId,
            orderId: order.id,
            externalOrderId: input.externalOrderId,
            version: (latestVersion._max.version ?? 0) + 1,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            channelProvider: input.provider,
            paymentStatus: input.paymentStatus,
            soldAt: input.soldAt ? new Date(input.soldAt) : undefined,
            paidAmount,
            estimatedNetAmount,
            financialSignature,
            isCurrent: true,
            revenueAmount,
            cogsAmount,
            channelFeeAmount,
            grossMarginAmount,
            currency,
            itemCount: items.length,
            fulfilledAt: order.fulfilledAt,
            components,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit(tenantId, actorUserId, fact.id, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: input.provider,
      externalOrderId: input.externalOrderId,
      paymentStatus: input.paymentStatus,
      paidAmount: paidAmount?.toString(),
      estimatedNetAmount: estimatedNetAmount?.toString(),
      revenueAmount: revenueAmount.toString(),
      channelFeeAmount: channelFeeAmount.toString(),
      cogsAmount: cogsAmount.toString(),
      grossMarginAmount: grossMarginAmount.toString(),
    });
    await this.outbox(tenantId, fact.id, {
      factId: fact.id,
      orderId: order.id,
      provider: input.provider,
      version: fact.version,
      paymentStatus: input.paymentStatus,
      paidAmount: paidAmount?.toString(),
      estimatedNetAmount: estimatedNetAmount?.toString(),
      revenueAmount: revenueAmount.toString(),
      channelFeeAmount: channelFeeAmount.toString(),
      cogsAmount: cogsAmount.toString(),
      grossMarginAmount: grossMarginAmount.toString(),
    });

    return { ...fact, components };
  }

  private normalizeChannelFinancialInput(input: {
    provider: ChannelProvider;
    externalOrderId: string;
    currency?: string;
    paymentStatus?: string;
    soldAt?: string;
    revenueAmount?: string;
    paidAmount?: string;
    channelFeeAmount?: string;
    estimatedNetAmount?: string;
    freightAmount?: string;
    discountAmount?: string;
  }) {
    return {
      provider: input.provider,
      externalOrderId: input.externalOrderId,
      currency: input.currency ?? 'BRL',
      paymentStatus: input.paymentStatus ?? null,
      soldAt: input.soldAt ?? null,
      revenueAmount: this.normalizedDecimal(input.revenueAmount),
      paidAmount: this.normalizedDecimal(input.paidAmount),
      channelFeeAmount: this.normalizedDecimal(input.channelFeeAmount),
      estimatedNetAmount: this.normalizedDecimal(input.estimatedNetAmount),
      freightAmount: this.normalizedDecimal(input.freightAmount),
      discountAmount: this.normalizedDecimal(input.discountAmount),
    };
  }

  async createFulfilledOrderFact(orderId: string, tenantId: string, actorUserId?: string) {
    const existingFact = await this.prisma.orderFinancialFact.findFirst({
      where: { tenantId, orderId, version: 1 },
    });
    if (existingFact) return existingFact;

    const order = await this.findOrderWithSku(orderId, tenantId);
    if (order.status !== InternalOrderStatus.FULFILLED) {
      throw new BadRequestException('Financial facts are created only for fulfilled orders.');
    }

    const revenueAmount = new Prisma.Decimal(0);
    const channelFeeAmount = new Prisma.Decimal(0);
    const { cogsAmount, items } = this.calculateCogs(order.items);

    const grossMarginAmount = revenueAmount.sub(cogsAmount).sub(channelFeeAmount);
    const components = {
      revenue: {
        source: 'Not captured by InternalOrder in 10.0.9',
        amount: revenueAmount.toString(),
      },
      cogs: {
        source: 'ProductSku.averageCost snapshot at fulfillment fact creation',
        amount: cogsAmount.toString(),
      },
      channelFees: {
        source: 'No channel fee captured in this sprint',
        amount: channelFeeAmount.toString(),
      },
      marginFormula: 'revenueAmount - cogsAmount - channelFeeAmount',
      items,
    };

    const fact = await this.prisma.orderFinancialFact.create({
      data: {
        tenantId,
        orderId: order.id,
        version: 1,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        revenueAmount,
        cogsAmount,
        channelFeeAmount,
        grossMarginAmount,
        currency: items[0]?.currency ?? 'BRL',
        itemCount: items.length,
        fulfilledAt: order.fulfilledAt,
        components: components,
      },
    });

    await this.audit(tenantId, actorUserId, fact.id, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      cogsAmount: cogsAmount.toString(),
      grossMarginAmount: grossMarginAmount.toString(),
    });
    await this.outbox(tenantId, fact.id, {
      factId: fact.id,
      orderId: order.id,
      revenueAmount: revenueAmount.toString(),
      cogsAmount: cogsAmount.toString(),
      grossMarginAmount: grossMarginAmount.toString(),
    });

    return {
      ...fact,
      components,
    };
  }

  async listFacts(tenantId: string, query: ListOrderFinancialFactsQueryDto) {
    const { page = 1, perPage = 10 } = query;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;
    const where = this.buildWhere(tenantId, query);

    const [data, total] = await Promise.all([
      this.prisma.orderFinancialFact.findMany({
        where,
        skip,
        take,
        orderBy: { calculatedAt: 'desc' },
      }),
      this.prisma.orderFinancialFact.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  async getDashboard(tenantId: string, query: ListOrderFinancialFactsQueryDto) {
    const where = this.buildWhere(tenantId, query);
    const [countAggregate, revenueAggregate, cogsAggregate, marginAggregate] = await Promise.all([
      this.prisma.orderFinancialFact.aggregate({ where, _count: { id: true } }),
      this.prisma.orderFinancialFact.aggregate({ where, _sum: { revenueAmount: true } }),
      this.prisma.orderFinancialFact.aggregate({ where, _sum: { cogsAmount: true } }),
      this.prisma.orderFinancialFact.aggregate({ where, _sum: { grossMarginAmount: true } }),
    ]);

    return {
      orderCount: countAggregate._count.id,
      revenueAmount: (revenueAggregate._sum.revenueAmount ?? new Prisma.Decimal(0)).toString(),
      cogsAmount: (cogsAggregate._sum.cogsAmount ?? new Prisma.Decimal(0)).toString(),
      grossMarginAmount: (
        marginAggregate._sum.grossMarginAmount ?? new Prisma.Decimal(0)
      ).toString(),
      note: 'Operational margin only. This is not payment settlement or cash reconciliation.',
    };
  }

  private buildWhere(tenantId: string, query: ListOrderFinancialFactsQueryDto) {
    const where: Prisma.OrderFinancialFactWhereInput = {
      tenantId,
      channelProvider: query.channelProvider,
    };

    if (query.dateFrom || query.dateTo) {
      where.calculatedAt = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      };
    }

    return where;
  }

  private async findOrderWithSku(orderId: string, tenantId: string) {
    const order = await this.prisma.internalOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: { sku: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  private calculateCogs(
    itemsWithSku: Array<{
      id: string;
      skuId: string | null;
      quantity: Prisma.Decimal | string | number;
      sku: {
        id: string;
        skuCanonical: string;
        averageCost: Prisma.Decimal | string | number;
        currency: string;
      };
    }>,
    preferredCurrency?: string,
  ) {
    let cogsAmount = new Prisma.Decimal(0);
    const items = itemsWithSku.map((item) => {
      const quantity = new Prisma.Decimal(item.quantity);
      const unitCost = new Prisma.Decimal(item.sku.averageCost);
      const itemCogs = quantity.mul(unitCost);
      cogsAmount = cogsAmount.add(itemCogs);

      return {
        orderItemId: item.id,
        skuId: item.skuId ?? item.sku.id,
        skuCanonical: item.sku.skuCanonical,
        quantity: quantity.toString(),
        unitCost: unitCost.toString(),
        cogsAmount: itemCogs.toString(),
        currency: preferredCurrency ?? item.sku.currency,
      };
    });

    return {
      cogsAmount,
      items,
      currency: preferredCurrency ?? items[0]?.currency ?? 'BRL',
    };
  }

  private decimal(value: string | undefined) {
    return new Prisma.Decimal(value ?? 0);
  }

  private optionalDecimal(value: string | undefined) {
    return value === undefined ? undefined : new Prisma.Decimal(value);
  }

  private normalizedDecimal(value: string | undefined) {
    return value === undefined ? null : new Prisma.Decimal(value).toString();
  }

  private async audit(
    tenantId: string,
    actorUserId: string | undefined,
    factId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'financial-intelligence.order_fact.created',
        entityType: 'OrderFinancialFact',
        entityId: factId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private async outbox(tenantId: string, factId: string, payload: Record<string, unknown>) {
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'OrderFinancialFact',
        aggregateId: factId,
        eventType: 'financial.order_fact.created',
        eventVersion: 1,
        payload: payload as Prisma.InputJsonValue,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
  }
}
