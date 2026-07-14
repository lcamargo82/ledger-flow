import {
  ChannelProvider,
  InternalOrderStatus,
  InventoryReservationStatus,
  Prisma,
  ReconciliationCaseStatus,
  WebhookProvider,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { SalesIntelligenceService } from './sales-intelligence.service';

describe('SalesIntelligenceService detail and timeline', () => {
  const prisma = {
    internalOrder: { findFirst: jest.fn() },
    inventoryMovement: { findMany: jest.fn() },
    notificationEvent: { findMany: jest.fn() },
    outboxEvent: { findMany: jest.fn() },
    cashLedgerEntry: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T15:00:00.000Z'));
    prisma.internalOrder.findFirst.mockResolvedValue(makeDetailedOrder());
    prisma.inventoryMovement.findMany.mockResolvedValue([
      {
        id: 'movement-1',
        type: 'FULFILLMENT',
        occurredAt: new Date('2026-07-14T12:00:00.000Z'),
        reasonCode: 'ORDER_FULFILLED',
        sourceType: 'ORDER_ITEM',
      },
    ]);
    prisma.notificationEvent.findMany.mockResolvedValue([
      {
        id: 'notification-1',
        eventType: 'sale.low_margin_detected',
        severity: 'WARNING',
        titleKey: 'notifications.events.saleLowMarginDetected.title',
        messageKey: 'notifications.events.saleLowMarginDetected.message',
        occurredAt: new Date('2026-07-14T14:00:00.000Z'),
        metadataJson: { orderId: 'order-1', accessToken: 'must-not-leak' },
      },
    ]);
    prisma.outboxEvent.findMany.mockResolvedValue([
      {
        id: 'outbox-1',
        eventType: 'financial.order_fact.created',
        createdAt: new Date('2026-07-14T11:30:00.000Z'),
      },
    ]);
    prisma.cashLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'cash-1',
        type: 'SETTLEMENT_CREDIT',
        amountMinor: new Prisma.Decimal('12860'),
        occurredAt: new Date('2026-07-14T13:00:00.000Z'),
      },
    ]);
  });

  afterEach(() => jest.useRealTimers());

  it('returns complete sale intelligence with snapshot COGS, realized profit and readable inventory labels', async () => {
    const service = new SalesIntelligenceService(prisma as never);

    const result = await service.getDetail('tenant-1', 'order-1', [
      'sales-intelligence:view-profitability',
      'sales-intelligence:view-settlement',
      'payments:read',
      'inventory:read',
    ]);

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        productName: 'Controle Gamepad Wireless',
        sku: 'CONTROLLER-GAMEPAD',
        warehouseName: 'Estoque principal',
        warehouseCode: 'MAIN',
        unitCostMinor: '4000',
        cogsAmountMinor: '8000',
      }),
    );
    expect(result.financial).toEqual(
      expect.objectContaining({
        grossAmountMinor: '15000',
        shippingCostMinor: '500',
        cogsAmountMinor: '8000',
        estimatedProfitMinor: '4360',
        realizedProfitMinor: '4360',
        marginPercent: '29.07',
        profitabilityStatus: 'PROFIT',
        profitSource: 'REALIZED',
      }),
    );
    expect(result.shipping.status).toBe('DELIVERED');
    expect(result.settlement).toEqual(
      expect.objectContaining({ status: 'RECONCILED', cashStatus: 'REALIZED' }),
    );
  });

  it('redacts profitability, settlement, payment and inventory fields in the backend', async () => {
    const service = new SalesIntelligenceService(prisma as never);

    const result = await service.getDetail('tenant-1', 'order-1', []);

    expect(result.permissions).toEqual({
      canViewProfitability: false,
      canViewSettlement: false,
      canViewPayment: false,
      canViewInventory: false,
    });
    expect(result.financial.cogsAmountMinor).toBeNull();
    expect(result.financial.realizedProfitMinor).toBeNull();
    expect(result.financial.marginPercent).toBeNull();
    expect(result.payment).toBeNull();
    expect(result.settlement).toBeNull();
    expect(result.items[0].stockStatus).toBeNull();
    expect(result.items[0].warehouseName).toBeNull();
  });

  it('returns a chronological sanitized timeline without raw payload metadata', async () => {
    const service = new SalesIntelligenceService(prisma as never);

    const result = await service.getTimeline('tenant-1', 'order-1', [
      'sales-intelligence:view-settlement',
      'payments:read',
      'inventory:read',
    ]);

    expect(result.map((event) => event.occurredAt.toISOString())).toEqual(
      [...result]
        .map((event) => event.occurredAt.toISOString())
        .sort((left, right) => left.localeCompare(right)),
    );
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(JSON.stringify(result)).not.toContain('normalizedPayload');
    expect(result.map((event) => event.source)).toEqual(
      expect.arrayContaining(['ORDER', 'PAYMENT', 'INVENTORY', 'SHIPPING', 'SETTLEMENT']),
    );
  });

  it('does not leak whether an order exists outside the tenant', async () => {
    prisma.internalOrder.findFirst.mockResolvedValue(null);
    const service = new SalesIntelligenceService(prisma as never);

    await expect(service.getDetail('tenant-1', 'other-order', [])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.internalOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'other-order', tenantId: 'tenant-1' } }),
    );
  });
});

function makeDetailedOrder() {
  return {
    id: 'order-1',
    orderNumber: 'ML-123456',
    status: InternalOrderStatus.FULFILLED,
    customerName: 'Cliente seguro',
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
    confirmedAt: new Date('2026-07-14T10:30:00.000Z'),
    fulfilledAt: new Date('2026-07-14T12:00:00.000Z'),
    cancelledAt: null,
    items: [
      {
        id: 'item-1',
        skuId: 'sku-1',
        warehouseId: 'warehouse-1',
        reservationId: 'reservation-1',
        quantity: new Prisma.Decimal('2'),
        sku: {
          id: 'sku-1',
          skuDisplay: 'CONTROLLER-GAMEPAD',
          averageCost: new Prisma.Decimal('40'),
          product: { name: 'Controle Gamepad Wireless' },
        },
        warehouse: { name: 'Estoque principal', code: 'MAIN' },
        reservation: { status: InventoryReservationStatus.CONSUMED },
      },
    ],
    financialFacts: [
      {
        id: 'fact-1',
        channelProvider: ChannelProvider.MERCADO_LIVRE,
        externalOrderId: '2000000001',
        paymentStatus: 'approved',
        paidAmount: new Prisma.Decimal('150'),
        revenueAmount: new Prisma.Decimal('150'),
        channelFeeAmount: new Prisma.Decimal('21.40'),
        estimatedNetAmount: new Prisma.Decimal('128.60'),
        cogsAmount: new Prisma.Decimal('80'),
        soldAt: new Date('2026-07-14T10:00:00.000Z'),
        calculatedAt: new Date('2026-07-14T11:00:00.000Z'),
        currency: 'BRL',
        components: {
          channelFees: { provided: true },
          freight: { amount: '5.00' },
          items: [
            {
              orderItemId: 'item-1',
              unitCost: '40',
              cogsAmount: '80',
              quantity: '2',
            },
          ],
        },
      },
    ],
    shippingSummaries: [
      {
        id: 'shipping-1',
        status: 'delivered',
        substatus: null,
        shippingMode: 'me2',
        logisticType: 'drop_off',
        handlingEstimateAt: null,
        deliveryEstimateAt: new Date('2026-07-16T18:00:00.000Z'),
        postedAt: new Date('2026-07-14T12:30:00.000Z'),
        trackingCodeMasked: '***1234',
        updatedAt: new Date('2026-07-14T13:30:00.000Z'),
      },
    ],
    reconciliationCases: [
      {
        id: 'case-1',
        status: ReconciliationCaseStatus.RECONCILED,
        matchedAt: new Date('2026-07-14T12:40:00.000Z'),
        reconciledAt: new Date('2026-07-14T13:00:00.000Z'),
        updatedAt: new Date('2026-07-14T13:00:00.000Z'),
        payment: { id: 'payment-1', status: 'CONFIRMED', reference: 'PAY-1' },
        decisions: [],
        settlementEvent: {
          id: 'settlement-1',
          provider: WebhookProvider.MERCADO_PAGO,
          providerStatus: 'approved',
          eventType: 'payment',
          amountMinor: new Prisma.Decimal('15000'),
          feeAmountMinor: new Prisma.Decimal('2140'),
          netAmountMinor: new Prisma.Decimal('12860'),
          currency: 'BRL',
          availableAt: new Date('2026-07-14T12:50:00.000Z'),
          occurredAt: new Date('2026-07-14T12:30:00.000Z'),
          receivedAt: new Date('2026-07-14T12:35:00.000Z'),
          operationalFinancialAccountId: 'account-1',
        },
      },
    ],
  };
}
