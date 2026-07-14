/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ChannelProvider,
  InternalOrderStatus,
  InventoryReservationStatus,
  Prisma,
  ReconciliationCaseStatus,
  WebhookProvider,
} from '@prisma/client';
import {
  SalesIntelligenceNetAmountSource,
  SalesIntelligenceStockStatus,
} from '../../domain/enums/sales-intelligence.enums';
import { SalesIntelligenceService } from './sales-intelligence.service';

describe('SalesIntelligenceService', () => {
  const prisma = {
    internalOrder: { findMany: jest.fn(), count: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.internalOrder.count.mockResolvedValue(1);
  });

  it('consolidates the latest order fact, realized net and consumed stock without N+1', async () => {
    prisma.internalOrder.findMany.mockResolvedValue([
      makeOrder({
        reconciliationCases: [
          {
            status: ReconciliationCaseStatus.RECONCILED,
            settlementEvent: {
              provider: WebhookProvider.MERCADO_PAGO,
              providerStatus: 'approved',
              eventType: 'payment',
              amountMinor: new Prisma.Decimal('11500'),
              feeAmountMinor: new Prisma.Decimal('1205'),
              netAmountMinor: new Prisma.Decimal('10295'),
              currency: 'BRL',
              availableAt: new Date('2026-07-13T10:00:00.000Z'),
              occurredAt: new Date('2026-07-12T10:00:00.000Z'),
            },
          },
        ],
        reservationStatus: InventoryReservationStatus.CONSUMED,
      }),
    ]);
    const service = new SalesIntelligenceService(
      prisma as never,
      () => new Date('2026-07-14T10:00:00.000Z'),
    );

    const result = await service.list('tenant-1', { page: 1, perPage: 20 });

    expect(prisma.internalOrder.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.internalOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          AND: [
            {
              financialFacts: {
                some: { channelProvider: ChannelProvider.MERCADO_LIVRE, isCurrent: true },
              },
            },
          ],
        }),
      }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        externalOrderId: '2000000001',
        paidAmountMinor: '11500',
        feeAmountMinor: '1205',
        netAmountMinor: '10295',
        netAmountSource: SalesIntelligenceNetAmountSource.REALIZED,
        stockStatus: SalesIntelligenceStockStatus.CONSUMED,
      }),
    );
  });

  it('uses reconciled net before estimated net when funds are not released yet', async () => {
    prisma.internalOrder.findMany.mockResolvedValue([
      makeOrder({
        reconciliationCases: [
          {
            status: ReconciliationCaseStatus.RECONCILED,
            settlementEvent: {
              provider: WebhookProvider.MERCADO_PAGO,
              providerStatus: 'approved',
              eventType: 'payment',
              amountMinor: new Prisma.Decimal('11500'),
              feeAmountMinor: new Prisma.Decimal('1205'),
              netAmountMinor: new Prisma.Decimal('10295'),
              currency: 'BRL',
              availableAt: new Date('2026-07-15T10:00:00.000Z'),
              occurredAt: new Date('2026-07-12T10:00:00.000Z'),
            },
          },
        ],
      }),
    ]);
    const service = new SalesIntelligenceService(
      prisma as never,
      () => new Date('2026-07-14T10:00:00.000Z'),
    );

    const result = await service.list('tenant-1', {});

    expect(result.data[0].netAmountSource).toBe(SalesIntelligenceNetAmountSource.RECONCILED);
  });

  it('falls back to explicitly estimated net and marks mixed stock as divergent', async () => {
    const order = makeOrder();
    order.items.push({
      ...order.items[0],
      id: 'item-2',
      reservation: { status: InventoryReservationStatus.RELEASED },
    });
    prisma.internalOrder.findMany.mockResolvedValue([order]);
    const service = new SalesIntelligenceService(prisma as never);

    const result = await service.list('tenant-1', {});

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        netAmountMinor: '10295',
        netAmountSource: SalesIntelligenceNetAmountSource.ESTIMATED,
        stockStatus: SalesIntelligenceStockStatus.DIVERGENT,
      }),
    );
  });

  it('does not present an estimate for cancelled or refunded payments', async () => {
    prisma.internalOrder.findMany.mockResolvedValue([
      makeOrder({ paymentStatus: 'refunded', orderStatus: InternalOrderStatus.CANCELLED }),
    ]);
    const service = new SalesIntelligenceService(prisma as never);

    const result = await service.list('tenant-1', {});

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        netAmountMinor: null,
        netAmountSource: SalesIntelligenceNetAmountSource.UNAVAILABLE,
      }),
    );
  });

  it('falls back to estimated data when a settlement has an amount divergence', async () => {
    prisma.internalOrder.findMany.mockResolvedValue([
      makeOrder({
        reconciliationCases: [
          {
            status: ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
            settlementEvent: {
              provider: WebhookProvider.MERCADO_PAGO,
              providerStatus: 'approved',
              eventType: 'payment',
              amountMinor: new Prisma.Decimal('11400'),
              feeAmountMinor: new Prisma.Decimal('1205'),
              netAmountMinor: new Prisma.Decimal('10195'),
              currency: 'BRL',
              availableAt: new Date('2026-07-15T10:00:00.000Z'),
              occurredAt: new Date('2026-07-12T10:00:00.000Z'),
            },
          },
        ],
      }),
    ]);
    const service = new SalesIntelligenceService(
      prisma as never,
      () => new Date('2026-07-14T10:00:00.000Z'),
    );

    const result = await service.list('tenant-1', {});

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        netAmountMinor: '10295',
        netAmountSource: SalesIntelligenceNetAmountSource.ESTIMATED,
      }),
    );
  });

  it('applies payment and stock filters before backend pagination', async () => {
    prisma.internalOrder.findMany.mockResolvedValue([makeOrder()]);
    const service = new SalesIntelligenceService(prisma as never);

    const result = await service.list('tenant-1', {
      page: 1,
      perPage: 1,
      paymentStatus: 'paid',
      stockStatus: SalesIntelligenceStockStatus.RESERVED,
    });

    expect(result.meta).toEqual({ page: 1, perPage: 1, total: 1, totalPages: 1 });
    expect(result.data).toHaveLength(1);
    expect(prisma.internalOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 1,
        where: expect.objectContaining({ tenantId: 'tenant-1', AND: expect.any(Array) }),
      }),
    );
  });

  it.each([
    [null, SalesIntelligenceStockStatus.PENDING],
    [InventoryReservationStatus.ACTIVE, SalesIntelligenceStockStatus.RESERVED],
    [InventoryReservationStatus.CONSUMED, SalesIntelligenceStockStatus.CONSUMED],
    [InventoryReservationStatus.RELEASED, SalesIntelligenceStockStatus.RELEASED],
  ])('maps reservation status %s to aggregate stock status %s', async (status, expected) => {
    prisma.internalOrder.findMany.mockResolvedValue([makeOrder({ reservationStatus: status })]);
    const service = new SalesIntelligenceService(prisma as never);

    const result = await service.list('tenant-1', {});

    expect(result.data[0].stockStatus).toBe(expected);
  });

  it('summarizes minor-unit amounts by their explicit net provenance', async () => {
    prisma.internalOrder.findMany.mockResolvedValue([
      makeOrder({
        reconciliationCases: [
          {
            status: ReconciliationCaseStatus.RECONCILED,
            settlementEvent: {
              provider: WebhookProvider.MERCADO_PAGO,
              providerStatus: 'approved',
              eventType: 'payment',
              amountMinor: new Prisma.Decimal('11500'),
              feeAmountMinor: new Prisma.Decimal('1205'),
              netAmountMinor: new Prisma.Decimal('10295'),
              currency: 'BRL',
              availableAt: new Date('2026-07-13T10:00:00.000Z'),
              occurredAt: new Date('2026-07-12T10:00:00.000Z'),
            },
          },
        ],
      }),
      makeOrder({ id: 'order-2' }),
    ]);
    const service = new SalesIntelligenceService(
      prisma as never,
      () => new Date('2026-07-14T10:00:00.000Z'),
    );

    const result = await service.getSummary('tenant-1');

    expect(result).toEqual({
      orderCount: 2,
      paidAmountMinor: '23000',
      feeAmountMinor: '2410',
      netAmountMinor: '20590',
      realizedNetAmountMinor: '10295',
      reconciledNetAmountMinor: '0',
      estimatedNetAmountMinor: '10295',
      stockIssueCount: 0,
      currency: 'BRL',
    });
  });
});

function makeOrder(
  options: {
    id?: string;
    paymentStatus?: string;
    orderStatus?: InternalOrderStatus;
    reservationStatus?: InventoryReservationStatus | null;
    reconciliationCases?: unknown[];
  } = {},
) {
  return {
    id: options.id ?? 'order-1',
    orderNumber: options.id ? `ORD-${options.id}` : 'ORD-1',
    status: options.orderStatus ?? InternalOrderStatus.CONFIRMED,
    createdAt: new Date('2026-07-12T10:00:00.000Z'),
    items: [
      {
        id: 'item-1',
        skuId: 'sku-1',
        quantity: new Prisma.Decimal('2'),
        sku: {
          id: 'sku-1',
          skuDisplay: 'SKU-1',
          product: { name: 'Produto 1' },
        },
        reservation:
          options.reservationStatus === null
            ? null
            : { status: options.reservationStatus ?? InventoryReservationStatus.ACTIVE },
      },
    ],
    financialFacts: [
      {
        externalOrderId: '2000000001',
        paymentStatus: options.paymentStatus ?? 'paid',
        paidAmount: new Prisma.Decimal('115.00'),
        channelFeeAmount: new Prisma.Decimal('12.05'),
        estimatedNetAmount: new Prisma.Decimal('102.95'),
        soldAt: new Date('2026-07-12T09:00:00.000Z'),
        currency: 'BRL',
        components: { channelFees: { provided: true } },
      },
    ],
    reconciliationCases: options.reconciliationCases ?? [],
  };
}
