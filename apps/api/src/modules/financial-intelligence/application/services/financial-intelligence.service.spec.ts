/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { ChannelProvider, InternalOrderStatus, Prisma } from '@prisma/client';
import { FinancialIntelligenceService } from './financial-intelligence.service';

describe('FinancialIntelligenceService', () => {
  const prisma = {
    $transaction: jest.fn(),
    internalOrder: { findFirst: jest.fn() },
    orderFinancialFact: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    outboxEvent: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    prisma.orderFinancialFact.aggregate.mockResolvedValue({ _max: { version: null } });
  });

  it('creates an explainable fulfilled order fact using Decimal COGS snapshots', async () => {
    prisma.internalOrder.findFirst.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-1',
      orderNumber: 'ORD-1',
      status: InternalOrderStatus.FULFILLED,
      fulfilledAt: new Date('2026-07-02T10:00:00.000Z'),
      items: [
        {
          id: 'item-1',
          quantity: new Prisma.Decimal('2'),
          sku: {
            id: 'sku-1',
            skuCanonical: 'SKU-1',
            averageCost: new Prisma.Decimal('12.3456'),
            currency: 'BRL',
          },
        },
      ],
    });
    prisma.orderFinancialFact.findFirst.mockResolvedValue(null);
    prisma.orderFinancialFact.create.mockImplementation(({ data }) => ({ id: 'fact-1', ...data }));

    const service = new FinancialIntelligenceService(prisma as never);
    const fact = await service.createFulfilledOrderFact('order-1', 'tenant-1', 'user-1');

    expect(prisma.orderFinancialFact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        orderId: 'order-1',
        version: 1,
        revenueAmount: new Prisma.Decimal('0'),
        cogsAmount: new Prisma.Decimal('24.6912'),
        grossMarginAmount: new Prisma.Decimal('-24.6912'),
        itemCount: 1,
      }),
    });
    expect(fact.components.items[0]).toEqual(
      expect.objectContaining({
        skuId: 'sku-1',
        skuCanonical: 'SKU-1',
        quantity: '2',
        unitCost: '12.3456',
        cogsAmount: '24.6912',
      }),
    );
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'financial.order_fact.created',
          aggregateId: 'fact-1',
        }),
      }),
    );
  });

  it('is idempotent when the fulfilled order fact already exists', async () => {
    prisma.orderFinancialFact.findFirst.mockResolvedValue({ id: 'fact-1', version: 1 });
    const service = new FinancialIntelligenceService(prisma as never);

    const fact = await service.createFulfilledOrderFact('order-1', 'tenant-1', 'user-1');

    expect(fact).toEqual({ id: 'fact-1', version: 1 });
    expect(prisma.internalOrder.findFirst).not.toHaveBeenCalled();
    expect(prisma.orderFinancialFact.create).not.toHaveBeenCalled();
  });

  it('creates Mercado Livre operational financial facts without settlement semantics', async () => {
    prisma.internalOrder.findFirst.mockResolvedValue({
      id: 'order-ml-1',
      tenantId: 'tenant-1',
      orderNumber: 'ORD-ML-1',
      status: InternalOrderStatus.CONFIRMED,
      fulfilledAt: null,
      items: [
        {
          id: 'item-1',
          quantity: new Prisma.Decimal('2'),
          sku: {
            id: 'sku-1',
            skuCanonical: 'SKU-1',
            averageCost: new Prisma.Decimal('10.0000'),
            currency: 'BRL',
          },
        },
      ],
    });
    prisma.orderFinancialFact.findFirst.mockResolvedValue(null);
    prisma.orderFinancialFact.create.mockImplementation(({ data }) => ({
      id: 'fact-ml-1',
      ...data,
    }));
    const service = new FinancialIntelligenceService(prisma as never);

    const fact = await service.createChannelOrderOperationalFact(
      'order-ml-1',
      'tenant-1',
      'channel:integration-1',
      {
        provider: ChannelProvider.MERCADO_LIVRE,
        externalOrderId: '2000000001',
        currency: 'BRL',
        paymentStatus: 'paid',
        soldAt: '2026-07-14T13:30:00.000Z',
        revenueAmount: '120.50',
        paidAmount: '115.00',
        channelFeeAmount: '12.05',
        estimatedNetAmount: '102.95',
        freightAmount: '8.00',
        discountAmount: '5.50',
      },
    );

    expect(prisma.orderFinancialFact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        orderId: 'order-ml-1',
        externalOrderId: '2000000001',
        version: 1,
        paymentStatus: 'paid',
        soldAt: new Date('2026-07-14T13:30:00.000Z'),
        paidAmount: new Prisma.Decimal('115.00'),
        estimatedNetAmount: new Prisma.Decimal('102.95'),
        orderNumber: 'ORD-ML-1',
        orderStatus: InternalOrderStatus.CONFIRMED,
        channelProvider: ChannelProvider.MERCADO_LIVRE,
        revenueAmount: new Prisma.Decimal('120.50'),
        channelFeeAmount: new Prisma.Decimal('12.05'),
        cogsAmount: new Prisma.Decimal('20.0000'),
        grossMarginAmount: new Prisma.Decimal('88.45'),
        currency: 'BRL',
      }),
    });
    expect(fact.components).toEqual(
      expect.objectContaining({
        note: 'Operational marketplace financial fact only. This is not payment settlement or reconciliation.',
        provider: ChannelProvider.MERCADO_LIVRE,
        externalOrderId: '2000000001',
        freight: { amount: '8', source: 'Provider order detail when available' },
        discounts: { amount: '5.5', source: 'Provider order detail when available' },
      }),
    );
    expect(JSON.stringify(fact.components)).not.toContain('settlement_received');
  });

  it('does not create another revision when normalized financial data is unchanged', async () => {
    prisma.orderFinancialFact.findFirst.mockResolvedValue({
      id: 'fact-ml-1',
      version: 1,
      financialSignature: 'matching-signature',
    });
    const service = new FinancialIntelligenceService(prisma as never);

    const fact = await service.createChannelOrderOperationalFact(
      'order-ml-1',
      'tenant-1',
      'channel:integration-1',
      {
        provider: ChannelProvider.MERCADO_LIVRE,
        externalOrderId: '2000000001',
        paymentStatus: 'paid',
        paidAmount: '115.00',
        channelFeeAmount: '12.05',
        estimatedNetAmount: '102.95',
      },
    );

    expect(fact).toEqual(expect.objectContaining({ id: 'fact-ml-1', version: 1 }));
    expect(prisma.internalOrder.findFirst).not.toHaveBeenCalled();
    expect(prisma.orderFinancialFact.create).not.toHaveBeenCalled();
  });

  it('creates the next revision when normalized financial data changes', async () => {
    prisma.orderFinancialFact.findFirst.mockResolvedValue(null);
    prisma.orderFinancialFact.aggregate.mockResolvedValue({ _max: { version: 1 } });
    prisma.internalOrder.findFirst.mockResolvedValue({
      id: 'order-ml-1',
      orderNumber: 'ORD-ML-1',
      status: InternalOrderStatus.CONFIRMED,
      fulfilledAt: null,
      items: [],
    });
    prisma.orderFinancialFact.create.mockImplementation(({ data }) => ({
      id: 'fact-ml-2',
      ...data,
    }));
    const service = new FinancialIntelligenceService(prisma as never);

    await service.createChannelOrderOperationalFact(
      'order-ml-1',
      'tenant-1',
      'channel:integration-1',
      {
        provider: ChannelProvider.MERCADO_LIVRE,
        externalOrderId: '2000000001',
        paymentStatus: 'paid',
        paidAmount: '116.00',
        channelFeeAmount: '12.05',
        estimatedNetAmount: '103.95',
      },
    );

    expect(prisma.orderFinancialFact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ version: 2, paidAmount: new Prisma.Decimal('116.00') }),
    });
    expect(prisma.orderFinancialFact.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', orderId: 'order-ml-1', isCurrent: true },
      data: { isCurrent: false },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('returns dashboard totals without payment reconciliation semantics', async () => {
    prisma.orderFinancialFact.aggregate
      .mockResolvedValueOnce({ _count: { id: 2 } })
      .mockResolvedValueOnce({ _sum: { revenueAmount: new Prisma.Decimal('0') } })
      .mockResolvedValueOnce({ _sum: { cogsAmount: new Prisma.Decimal('30.0000') } })
      .mockResolvedValueOnce({ _sum: { grossMarginAmount: new Prisma.Decimal('-30.0000') } });
    const service = new FinancialIntelligenceService(prisma as never);

    const dashboard = await service.getDashboard('tenant-1', {});

    expect(dashboard).toEqual({
      orderCount: 2,
      revenueAmount: '0',
      cogsAmount: '30',
      grossMarginAmount: '-30',
      note: 'Operational margin only. This is not payment settlement or cash reconciliation.',
    });
  });
});
