import {
  InternalOrderStatus,
  InventoryReservationStatus,
  Prisma,
  ReconciliationCaseStatus,
} from '@prisma/client';
import { SalesIntelligenceRowDto } from '../dto/sales-intelligence-response.dto';
import {
  SalesIntelligenceNetAmountSource,
  SalesIntelligenceStockStatus,
} from '../../domain/enums/sales-intelligence.enums';
import { SalesIntelligenceOrder } from './sales-intelligence.query';

export function mapSalesIntelligenceOrder(
  order: SalesIntelligenceOrder,
  now: () => Date = () => new Date(),
): SalesIntelligenceRowDto {
  const fact = order.financialFacts[0];
  const settlement = resolveSettlement(order, now);
  const operationalFeeAmountMinor = isFeeProvided(fact?.components)
    ? majorToMinor(fact?.channelFeeAmount)
    : null;
  const estimatedAllowed = canUseEstimate(order.status, fact?.paymentStatus);
  const net = settlement ?? {
    amountMinor: estimatedAllowed ? majorToMinor(fact?.estimatedNetAmount) : null,
    source:
      estimatedAllowed && fact?.estimatedNetAmount
        ? SalesIntelligenceNetAmountSource.ESTIMATED
        : SalesIntelligenceNetAmountSource.UNAVAILABLE,
    paidAmountMinor: majorToMinor(fact?.paidAmount),
    feeAmountMinor: operationalFeeAmountMinor,
    currency: fact?.currency ?? 'BRL',
  };

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    externalOrderId: fact?.externalOrderId ?? null,
    soldAt: fact?.soldAt ?? order.createdAt,
    orderStatus: order.status,
    items: order.items.map((item) => ({
      orderItemId: item.id,
      skuId: item.skuId,
      sku: item.sku.skuDisplay,
      productName: item.sku.product.name,
      quantity: item.quantity.toString(),
      stockStatus: itemStockStatus(item.reservation?.status),
    })),
    paymentStatus: fact?.paymentStatus ?? null,
    paidAmountMinor: settlement?.paidAmountMinor ?? majorToMinor(fact?.paidAmount),
    feeAmountMinor: settlement?.feeAmountMinor ?? operationalFeeAmountMinor,
    netAmountMinor: net.amountMinor,
    netAmountSource: net.source,
    stockStatus: aggregateStockStatus(order),
    currency: net.currency,
  };
}

function resolveSettlement(order: SalesIntelligenceOrder, now: () => Date) {
  const cases = order.reconciliationCases.filter(
    (item) => item.settlementEvent.eventType === 'payment' && item.settlementEvent.netAmountMinor,
  );
  const realized = cases.find((item) => isRealized(item.settlementEvent, now));
  if (realized) return mapSettlement(realized, SalesIntelligenceNetAmountSource.REALIZED);

  const reconciled = cases.find((item) => item.status === ReconciliationCaseStatus.RECONCILED);
  return reconciled ? mapSettlement(reconciled, SalesIntelligenceNetAmountSource.RECONCILED) : null;
}

function isRealized(
  event: SalesIntelligenceOrder['reconciliationCases'][number]['settlementEvent'],
  now: () => Date,
) {
  return (
    event.providerStatus?.toLowerCase() === 'approved' &&
    Boolean(event.availableAt && event.availableAt <= now())
  );
}

function mapSettlement(
  item: SalesIntelligenceOrder['reconciliationCases'][number],
  source: SalesIntelligenceNetAmountSource,
) {
  return {
    amountMinor: item.settlementEvent.netAmountMinor?.toString() ?? null,
    source,
    paidAmountMinor: item.settlementEvent.amountMinor?.toString() ?? null,
    feeAmountMinor: item.settlementEvent.feeAmountMinor?.toString() ?? null,
    currency: item.settlementEvent.currency,
  };
}

function aggregateStockStatus(order: SalesIntelligenceOrder): SalesIntelligenceStockStatus {
  if (order.items.length === 0) return SalesIntelligenceStockStatus.UNAVAILABLE;
  const statuses = new Set(order.items.map((item) => itemStockStatus(item.reservation?.status)));
  if (statuses.size !== 1) return SalesIntelligenceStockStatus.DIVERGENT;
  return [...statuses][0] ?? SalesIntelligenceStockStatus.UNAVAILABLE;
}

function itemStockStatus(
  status: InventoryReservationStatus | undefined,
): SalesIntelligenceStockStatus {
  if (!status) return SalesIntelligenceStockStatus.PENDING;
  const mapped: Record<InventoryReservationStatus, SalesIntelligenceStockStatus> = {
    [InventoryReservationStatus.ACTIVE]: SalesIntelligenceStockStatus.RESERVED,
    [InventoryReservationStatus.CONSUMED]: SalesIntelligenceStockStatus.CONSUMED,
    [InventoryReservationStatus.RELEASED]: SalesIntelligenceStockStatus.RELEASED,
  };
  return mapped[status];
}

function canUseEstimate(
  orderStatus: InternalOrderStatus,
  paymentStatus: string | null | undefined,
) {
  if (orderStatus === InternalOrderStatus.CANCELLED) return false;
  return ['paid', 'approved'].includes(paymentStatus?.toLowerCase() ?? '');
}

function majorToMinor(value: Prisma.Decimal | null | undefined) {
  return value ? value.mul(100).toDecimalPlaces(0).toString() : null;
}

function isFeeProvided(components: Prisma.JsonValue | undefined) {
  if (!components || Array.isArray(components) || typeof components !== 'object') return false;
  const channelFees = components.channelFees;
  return (
    Boolean(channelFees) &&
    !Array.isArray(channelFees) &&
    typeof channelFees === 'object' &&
    channelFees !== null &&
    channelFees.provided === true
  );
}
