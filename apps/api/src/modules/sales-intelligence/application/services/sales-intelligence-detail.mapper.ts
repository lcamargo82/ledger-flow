import { Prisma, ReconciliationCaseStatus } from '@prisma/client';
import {
  SalesIntelligenceNetAmountSource,
  SalesIntelligenceProfitSource,
  SalesIntelligenceProfitabilityStatus,
  SalesIntelligenceStockStatus,
} from '../../domain/enums/sales-intelligence.enums';
import { SalesIntelligenceDetailOrder } from './sales-intelligence-detail.query';
import { mapSalesIntelligenceOrder } from './sales-intelligence.mapper';

export interface SalesIntelligenceFieldPermissions {
  canViewProfitability: boolean;
  canViewSettlement: boolean;
  canViewPayment: boolean;
  canViewInventory: boolean;
}

interface CashEntryLike {
  id: string;
  type: string;
  amountMinor: Prisma.Decimal;
  occurredAt: Date;
}

export function resolveSalesIntelligencePermissions(
  permissions: string[],
): SalesIntelligenceFieldPermissions {
  return {
    canViewProfitability: permissions.includes('sales-intelligence:view-profitability'),
    canViewSettlement: permissions.includes('sales-intelligence:view-settlement'),
    canViewPayment: permissions.includes('payments:read'),
    canViewInventory: permissions.includes('inventory:read'),
  };
}

export function mapSalesIntelligenceDetail(
  order: SalesIntelligenceDetailOrder,
  permissions: SalesIntelligenceFieldPermissions,
  cashEntries: CashEntryLike[],
  now: () => Date = () => new Date(),
) {
  const summary = mapSalesIntelligenceOrder(order);
  const fact = order.financialFacts[0];
  const componentItems = componentItemMap(fact?.components);
  const cogsAvailable = order.items.every((item) => {
    const unitCost = componentItems.get(item.id)?.unitCost;
    return unitCost !== undefined && new Prisma.Decimal(unitCost).greaterThan(0);
  });
  const cogsMinor = cogsAvailable ? majorToMinor(fact?.cogsAmount) : null;
  const grossMinor = majorToMinor(fact?.revenueAmount);
  const shippingMinor = componentMoneyMinor(fact?.components, 'freight');
  const estimatedNetMinor = majorToMinor(fact?.estimatedNetAmount);
  const realizedNetMinor =
    summary.netAmountSource === SalesIntelligenceNetAmountSource.REALIZED
      ? (summary.netAmountMinor ?? null)
      : null;
  const estimatedProfitMinor = profit(estimatedNetMinor, cogsMinor, shippingMinor);
  const realizedProfitMinor = profit(realizedNetMinor, cogsMinor, shippingMinor);
  const selectedProfitMinor = realizedProfitMinor ?? estimatedProfitMinor;
  const profitSource = realizedProfitMinor
    ? SalesIntelligenceProfitSource.REALIZED
    : estimatedProfitMinor
      ? SalesIntelligenceProfitSource.ESTIMATED
      : SalesIntelligenceProfitSource.UNAVAILABLE;
  const marginPercent = margin(selectedProfitMinor, grossMinor);
  const profitabilityStatus = resolveProfitabilityStatus(cogsAvailable, selectedProfitMinor);
  const shipping = order.shippingSummaries[0];
  const settlementCase = order.reconciliationCases[0];

  return {
    ...summary,
    permissions,
    items: order.items.map((item) => {
      const snapshot = componentItems.get(item.id);
      return {
        orderItemId: item.id,
        skuId: item.skuId,
        sku: item.sku.skuDisplay,
        productName: item.sku.product.name,
        quantity: item.quantity.toString(),
        stockStatus: permissions.canViewInventory
          ? itemStockStatus(item.reservation?.status)
          : null,
        warehouseName: permissions.canViewInventory ? item.warehouse.name : null,
        warehouseCode: permissions.canViewInventory ? item.warehouse.code : null,
        unitCostMinor:
          permissions.canViewProfitability && snapshot?.unitCost
            ? majorStringToMinor(snapshot.unitCost)
            : null,
        cogsAmountMinor:
          permissions.canViewProfitability && snapshot?.cogsAmount
            ? majorStringToMinor(snapshot.cogsAmount)
            : null,
      };
    }),
    payment: permissions.canViewPayment
      ? {
          status: fact?.paymentStatus ?? null,
          paidAmountMinor: summary.paidAmountMinor,
          reference: settlementCase?.payment?.reference ?? null,
        }
      : null,
    financial: {
      grossAmountMinor: grossMinor,
      feeAmountMinor: summary.feeAmountMinor,
      shippingCostMinor: shippingMinor,
      netAmountMinor: summary.netAmountMinor,
      netAmountSource: summary.netAmountSource,
      cogsAmountMinor: permissions.canViewProfitability ? cogsMinor : null,
      estimatedProfitMinor: permissions.canViewProfitability ? estimatedProfitMinor : null,
      realizedProfitMinor: permissions.canViewProfitability ? realizedProfitMinor : null,
      marginPercent: permissions.canViewProfitability ? marginPercent : null,
      profitabilityStatus: permissions.canViewProfitability
        ? profitabilityStatus
        : SalesIntelligenceProfitabilityStatus.UNAVAILABLE,
      profitSource: permissions.canViewProfitability
        ? profitSource
        : SalesIntelligenceProfitSource.UNAVAILABLE,
    },
    shipping: shipping
      ? {
          status: normalizeShippingStatus(shipping.status),
          providerStatus: shipping.status,
          substatus: shipping.substatus,
          shippingMode: shipping.shippingMode,
          logisticType: shipping.logisticType,
          handlingEstimateAt: shipping.handlingEstimateAt,
          deliveryEstimateAt: shipping.deliveryEstimateAt,
          postedAt: shipping.postedAt,
          trackingCodeMasked: shipping.trackingCodeMasked,
        }
      : { status: 'UNAVAILABLE' },
    settlement:
      permissions.canViewSettlement && settlementCase
        ? {
            caseId: settlementCase.id,
            status: normalizeSettlementStatus(settlementCase.status),
            cashStatus: resolveCashStatus(settlementCase, cashEntries, now),
            providerStatus: settlementCase.settlementEvent.providerStatus,
            availableAt: settlementCase.settlementEvent.availableAt,
            amountMinor: settlementCase.settlementEvent.amountMinor?.toString() ?? null,
            feeAmountMinor: settlementCase.settlementEvent.feeAmountMinor?.toString() ?? null,
            netAmountMinor: settlementCase.settlementEvent.netAmountMinor?.toString() ?? null,
            currency: settlementCase.settlementEvent.currency,
          }
        : null,
  };
}

function componentItemMap(components: Prisma.JsonValue | undefined) {
  const result = new Map<string, { unitCost?: string; cogsAmount?: string }>();
  const record = asRecord(components);
  if (!record || !Array.isArray(record.items)) return result;
  for (const item of record.items) {
    const itemRecord = asRecord(item);
    if (!itemRecord || typeof itemRecord.orderItemId !== 'string') continue;
    result.set(itemRecord.orderItemId, {
      ...(typeof itemRecord.unitCost === 'string' && { unitCost: itemRecord.unitCost }),
      ...(typeof itemRecord.cogsAmount === 'string' && { cogsAmount: itemRecord.cogsAmount }),
    });
  }
  return result;
}

function componentMoneyMinor(components: Prisma.JsonValue | undefined, key: string) {
  const record = asRecord(components);
  const component = record ? asRecord(record[key]) : null;
  if (!component) return null;
  const amount = component.amount;
  return typeof amount === 'string' || typeof amount === 'number'
    ? majorStringToMinor(String(amount))
    : null;
}

function profit(net: string | null, cogs: string | null, shipping: string | null) {
  if (net === null || cogs === null) return null;
  return (BigInt(net) - BigInt(cogs) - BigInt(shipping ?? 0)).toString();
}

function margin(profitMinor: string | null, grossMinor: string | null) {
  if (profitMinor === null || grossMinor === null || BigInt(grossMinor) === 0n) return null;
  return new Prisma.Decimal(profitMinor).div(grossMinor).mul(100).toDecimalPlaces(2).toFixed(2);
}

function resolveProfitabilityStatus(cogsAvailable: boolean, profitMinor: string | null) {
  if (!cogsAvailable) return SalesIntelligenceProfitabilityStatus.MISSING_COST;
  if (profitMinor === null) return SalesIntelligenceProfitabilityStatus.UNAVAILABLE;
  const value = BigInt(profitMinor);
  if (value > 0n) return SalesIntelligenceProfitabilityStatus.PROFIT;
  if (value < 0n) return SalesIntelligenceProfitabilityStatus.LOSS;
  return SalesIntelligenceProfitabilityStatus.BREAK_EVEN;
}

function itemStockStatus(status: string | undefined) {
  const statuses: Record<string, SalesIntelligenceStockStatus> = {
    ACTIVE: SalesIntelligenceStockStatus.RESERVED,
    CONSUMED: SalesIntelligenceStockStatus.CONSUMED,
    RELEASED: SalesIntelligenceStockStatus.RELEASED,
  };
  return statuses[status ?? ''] ?? SalesIntelligenceStockStatus.PENDING;
}

function normalizeShippingStatus(status: string | null) {
  const normalized = status?.toLowerCase() ?? '';
  if (['ready_to_ship', 'ready-to-ship'].includes(normalized)) return 'READY_TO_SHIP';
  if (['shipped', 'posted'].includes(normalized)) return 'POSTED';
  if (['in_transit', 'handling'].includes(normalized)) return 'IN_TRANSIT';
  if (['delivered'].includes(normalized)) return 'DELIVERED';
  if (['delayed', 'not_delivered'].includes(normalized)) return 'DELAYED';
  if (['cancelled', 'canceled'].includes(normalized)) return 'CANCELED';
  if (['pending'].includes(normalized)) return 'PENDING';
  return 'UNAVAILABLE';
}

function normalizeSettlementStatus(status: ReconciliationCaseStatus) {
  if (status === ReconciliationCaseStatus.RECONCILED) return 'RECONCILED';
  if (status === ReconciliationCaseStatus.IGNORED) return 'IGNORED';
  const divergentStatuses = new Set<ReconciliationCaseStatus>([
    ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
    ReconciliationCaseStatus.CURRENCY_DIVERGENCE,
    ReconciliationCaseStatus.STATUS_DIVERGENCE,
  ]);
  if (divergentStatuses.has(status)) return 'DIVERGENT';
  if (status === ReconciliationCaseStatus.PENDING) return 'PENDING';
  return 'MANUAL_REVIEW';
}

function resolveCashStatus(
  settlementCase: SalesIntelligenceDetailOrder['reconciliationCases'][number],
  cashEntries: CashEntryLike[],
  now: () => Date,
) {
  if (cashEntries.length > 0) return 'REALIZED';
  const status = settlementCase.settlementEvent.providerStatus?.toLowerCase();
  if (status === 'refunded') return 'REFUNDED';
  if (status === 'charged_back') return 'CHARGEBACK';
  if (status && ['in_mediation', 'blocked'].includes(status)) return 'BLOCKED';
  if (settlementCase.settlementEvent.availableAt) {
    return settlementCase.settlementEvent.availableAt <= now() ? 'RELEASED' : 'PENDING_RELEASE';
  }
  return 'UNAVAILABLE';
}

function majorToMinor(value: Prisma.Decimal | null | undefined) {
  return value ? value.mul(100).toDecimalPlaces(0).toString() : null;
}

function majorStringToMinor(value: string) {
  return new Prisma.Decimal(value).mul(100).toDecimalPlaces(0).toString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
