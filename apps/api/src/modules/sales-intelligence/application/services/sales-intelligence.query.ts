import {
  ChannelProvider,
  InventoryReservationStatus,
  Prisma,
  WebhookProvider,
} from '@prisma/client';
import { ListSalesIntelligenceQueryDto } from '../dto/list-sales-intelligence-query.dto';
import { SalesIntelligenceStockStatus } from '../../domain/enums/sales-intelligence.enums';

export const salesIntelligenceOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  createdAt: true,
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      skuId: true,
      quantity: true,
      reservation: { select: { status: true } },
      sku: {
        select: {
          id: true,
          skuDisplay: true,
          product: { select: { name: true } },
        },
      },
    },
  },
  financialFacts: {
    where: { channelProvider: ChannelProvider.MERCADO_LIVRE, isCurrent: true },
    orderBy: [{ version: 'desc' }, { calculatedAt: 'desc' }],
    take: 1,
    select: {
      externalOrderId: true,
      paymentStatus: true,
      paidAmount: true,
      channelFeeAmount: true,
      estimatedNetAmount: true,
      soldAt: true,
      currency: true,
      components: true,
    },
  },
  reconciliationCases: {
    where: { settlementEvent: { provider: WebhookProvider.MERCADO_PAGO } },
    orderBy: { updatedAt: 'desc' },
    select: {
      status: true,
      settlementEvent: {
        select: {
          providerStatus: true,
          eventType: true,
          amountMinor: true,
          feeAmountMinor: true,
          netAmountMinor: true,
          currency: true,
          availableAt: true,
        },
      },
    },
  },
} satisfies Prisma.InternalOrderSelect;

export type SalesIntelligenceOrder = Prisma.InternalOrderGetPayload<{
  select: typeof salesIntelligenceOrderSelect;
}>;

export function buildSalesIntelligenceWhere(
  tenantId: string,
  query: ListSalesIntelligenceQueryDto,
): Prisma.InternalOrderWhereInput {
  const conditions: Prisma.InternalOrderWhereInput[] = [currentMercadoLivreFact()];
  if (query.orderReference) conditions.push(orderReferenceWhere(query.orderReference));
  if (query.dateFrom || query.dateTo) conditions.push(dateWhere(query));
  if (query.paymentStatus) conditions.push(paymentStatusWhere(query.paymentStatus));
  if (query.stockStatus) conditions.push(stockWhere(query.stockStatus));
  return { tenantId, AND: conditions };
}

function currentMercadoLivreFact(): Prisma.InternalOrderWhereInput {
  return {
    financialFacts: {
      some: { channelProvider: ChannelProvider.MERCADO_LIVRE, isCurrent: true },
    },
  };
}

function orderReferenceWhere(orderReference: string): Prisma.InternalOrderWhereInput {
  return {
    OR: [
      { orderNumber: { contains: orderReference, mode: 'insensitive' } },
      {
        financialFacts: {
          some: {
            channelProvider: ChannelProvider.MERCADO_LIVRE,
            isCurrent: true,
            externalOrderId: { contains: orderReference, mode: 'insensitive' },
          },
        },
      },
    ],
  };
}

function dateWhere(query: ListSalesIntelligenceQueryDto): Prisma.InternalOrderWhereInput {
  const range = {
    ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
    ...(query.dateTo && { lte: new Date(query.dateTo) }),
  };
  return {
    OR: [
      { createdAt: range },
      {
        financialFacts: {
          some: {
            channelProvider: ChannelProvider.MERCADO_LIVRE,
            isCurrent: true,
            soldAt: range,
          },
        },
      },
    ],
  };
}

function paymentStatusWhere(paymentStatus: string): Prisma.InternalOrderWhereInput {
  return {
    financialFacts: {
      some: {
        channelProvider: ChannelProvider.MERCADO_LIVRE,
        isCurrent: true,
        paymentStatus: { equals: paymentStatus, mode: 'insensitive' },
      },
    },
  };
}

function stockWhere(status: SalesIntelligenceStockStatus): Prisma.InternalOrderWhereInput {
  if (status === SalesIntelligenceStockStatus.UNAVAILABLE) return { items: { none: {} } };
  if (status === SalesIntelligenceStockStatus.PENDING) {
    return { items: { some: {}, every: { reservationId: null } } };
  }

  const reservationStatus: Partial<
    Record<SalesIntelligenceStockStatus, InventoryReservationStatus>
  > = {
    [SalesIntelligenceStockStatus.RESERVED]: InventoryReservationStatus.ACTIVE,
    [SalesIntelligenceStockStatus.CONSUMED]: InventoryReservationStatus.CONSUMED,
    [SalesIntelligenceStockStatus.RELEASED]: InventoryReservationStatus.RELEASED,
  };
  const uniformStatus = reservationStatus[status];
  if (uniformStatus) {
    return { items: { some: {}, every: { reservation: { is: { status: uniformStatus } } } } };
  }

  return {
    AND: [
      { items: { some: {} } },
      { NOT: { items: { every: { reservationId: null } } } },
      ...Object.values(InventoryReservationStatus).map((itemStatus) => ({
        NOT: { items: { every: { reservation: { is: { status: itemStatus } } } } },
      })),
    ],
  };
}
