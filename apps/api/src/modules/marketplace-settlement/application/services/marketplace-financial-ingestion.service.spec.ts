import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MarketplaceFinancialIngestionService } from './marketplace-financial-ingestion.service';

describe('MarketplaceFinancialIngestionService', () => {
  const account = {
    id: 'account-1',
    tenantId: 'tenant-1',
    gatewayConfigurationId: 'gateway-1',
    provider: 'MERCADO_PAGO',
    openingBalanceMinor: new Prisma.Decimal(1000),
    currentBalanceMinor: new Prisma.Decimal(9600),
    currency: 'BRL',
    gatewayConfiguration: {
      id: 'gateway-1',
      tenantId: 'tenant-1',
      provider: 'MERCADO_PAGO',
      status: 'ACTIVE',
    },
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      operationalFinancialAccount: {
        findFirst: jest.fn().mockResolvedValue(account),
      },
      providerSettlementEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      reconciliationCase: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      orderFinancialFact: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };
    const readiness = { assertSettlementReadable: jest.fn() };
    const credentialManager = { getValidAccessToken: jest.fn().mockResolvedValue('token') };
    const mercadoPagoRead = {
      fetchPaymentEvents: jest.fn().mockResolvedValue({
        data: [
          {
            provider: 'MERCADO_PAGO',
            operationalFinancialAccountId: 'account-1',
            providerEventId: 'mp-payment:gateway-1:123',
            providerPaymentId: '123',
            eventType: 'payment',
            amountMinor: '10000',
            feeAmountMinor: '500',
            netAmountMinor: '9500',
            currency: 'BRL',
            currencyExponent: 2,
            payloadHash: 'hash',
            normalizedPayload: { providerPaymentId: '123' },
          },
        ],
      }),
    };
    const reconciliationIngestion = {
      ingestNormalizedSettlement: jest.fn().mockResolvedValue({
        created: true,
        settlementEvent: {
          id: 'settlement-1',
          operationalFinancialAccountId: 'account-1',
          provider: 'MERCADO_PAGO',
          providerEventId: 'mp-payment:gateway-1:123',
          providerPaymentId: '123',
          netAmountMinor: new Prisma.Decimal('9500'),
          currency: 'BRL',
        },
      }),
    };
    const notificationProducer = {
      marketplaceSettlementEventReceived: jest.fn().mockResolvedValue(undefined),
    };

    return {
      prisma,
      readiness,
      credentialManager,
      mercadoPagoRead,
      reconciliationIngestion,
      notificationProducer,
      service: new MarketplaceFinancialIngestionService(
        (overrides.prisma as never) ?? (prisma as never),
        (overrides.readiness as never) ?? (readiness as never),
        (overrides.credentialManager as never) ?? (credentialManager as never),
        (overrides.mercadoPagoRead as never) ?? (mercadoPagoRead as never),
        (overrides.reconciliationIngestion as never) ?? (reconciliationIngestion as never),
        (overrides.notificationProducer as never) ?? (notificationProducer as never),
      ),
    };
  }

  it('syncs Mercado Pago events by period and emits marketplace outbox events only for new rows', async () => {
    const {
      service,
      readiness,
      credentialManager,
      mercadoPagoRead,
      reconciliationIngestion,
      notificationProducer,
      prisma,
    } = makeService();

    const result = await service.syncMercadoPagoByPeriod('tenant-1', 'user-1', 'account-1', {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
      maxPages: 1,
    });

    expect(readiness.assertSettlementReadable).toHaveBeenCalledWith(account.gatewayConfiguration);
    expect(credentialManager.getValidAccessToken).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      gatewayConfigurationId: 'gateway-1',
      purpose: 'SETTLEMENT',
    });
    expect(mercadoPagoRead.fetchPaymentEvents).toHaveBeenCalledWith({
      accessToken: 'token',
      gatewayConfigurationId: 'gateway-1',
      operationalFinancialAccountId: 'account-1',
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T23:59:59.999Z'),
      offset: 0,
    });
    expect(reconciliationIngestion.ingestNormalizedSettlement).toHaveBeenCalledTimes(1);
    expect(notificationProducer.marketplaceSettlementEventReceived).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      settlementEventId: 'settlement-1',
      operationalFinancialAccountId: 'account-1',
      provider: 'MERCADO_PAGO',
      providerEventId: 'mp-payment:gateway-1:123',
      providerPaymentId: '123',
      netAmountMinor: '9500',
      currency: 'BRL',
    });
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aggregateType: 'ProviderSettlementEvent',
        aggregateId: 'settlement-1',
        eventType: 'marketplace_settlement.event_received',
      }),
    });
    expect(result).toMatchObject({
      provider: 'MERCADO_PAGO',
      pagesFetched: 1,
      received: 1,
      created: 1,
      duplicates: 0,
    });
  });

  it('does not emit marketplace outbox events for duplicate provider rows', async () => {
    const reconciliationIngestion = {
      ingestNormalizedSettlement: jest.fn().mockResolvedValue({
        created: false,
        settlementEvent: { id: 'settlement-1' },
      }),
    };
    const notificationProducer = {
      marketplaceSettlementEventReceived: jest.fn().mockResolvedValue(undefined),
    };
    const { service, prisma } = makeService({ reconciliationIngestion, notificationProducer });

    const result = await service.syncMercadoPagoByPeriod('tenant-1', 'user-1', 'account-1', {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
      maxPages: 1,
    });

    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
    expect(notificationProducer.marketplaceSettlementEventReceived).not.toHaveBeenCalled();
    expect(result.created).toBe(0);
    expect(result.duplicates).toBe(1);
  });

  it('rejects invalid sync periods before provider IO', async () => {
    const { service, credentialManager } = makeService();

    await expect(
      service.syncMercadoPagoByPeriod('tenant-1', 'user-1', 'account-1', {
        from: '2026-07-31T23:59:59.999Z',
        to: '2026-07-01T00:00:00.000Z',
        maxPages: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(credentialManager.getValidAccessToken).not.toHaveBeenCalled();
  });

  it('returns imported totals scoped to the selected financial account', async () => {
    const { service, prisma } = makeService();
    prisma.providerSettlementEvent.findMany.mockResolvedValue([
      {
        amountMinor: new Prisma.Decimal(10000),
        feeAmountMinor: new Prisma.Decimal(500),
        netAmountMinor: new Prisma.Decimal(9500),
        currency: 'BRL',
      },
      {
        amountMinor: new Prisma.Decimal(2500),
        feeAmountMinor: new Prisma.Decimal(125),
        netAmountMinor: new Prisma.Decimal(2375),
        currency: 'BRL',
      },
    ]);

    const totals = await service.getImportedTotals('tenant-1', 'account-1');

    expect(totals).toEqual({
      eventCount: 2,
      grossAmountMinor: '12500',
      feeAmountMinor: '625',
      netAmountMinor: '11875',
      currency: 'BRL',
    });
  });

  it('returns operational cash position and P&L dashboard scoped to the selected account', async () => {
    const { service, prisma } = makeService();
    prisma.providerSettlementEvent.findMany.mockResolvedValue([
      {
        id: 'event-released',
        eventType: 'payment',
        providerStatus: 'approved',
        amountMinor: new Prisma.Decimal(10000),
        feeAmountMinor: new Prisma.Decimal(500),
        netAmountMinor: new Prisma.Decimal(9500),
        currency: 'BRL',
        availableAt: new Date('2026-07-01T00:00:00.000Z'),
      },
      {
        id: 'event-pending',
        eventType: 'payment',
        providerStatus: 'approved',
        amountMinor: new Prisma.Decimal(3000),
        feeAmountMinor: new Prisma.Decimal(150),
        netAmountMinor: new Prisma.Decimal(2850),
        currency: 'BRL',
        availableAt: new Date('2999-07-01T00:00:00.000Z'),
      },
      {
        id: 'event-blocked',
        eventType: 'payment',
        providerStatus: 'pending',
        amountMinor: new Prisma.Decimal(2000),
        feeAmountMinor: new Prisma.Decimal(0),
        netAmountMinor: new Prisma.Decimal(2000),
        currency: 'BRL',
        availableAt: null,
      },
      {
        id: 'event-refund',
        eventType: 'payment_refunded',
        providerStatus: 'refunded',
        amountMinor: new Prisma.Decimal(-1000),
        feeAmountMinor: new Prisma.Decimal(0),
        netAmountMinor: new Prisma.Decimal(-1000),
        currency: 'BRL',
        availableAt: new Date('2026-07-02T00:00:00.000Z'),
      },
    ]);
    prisma.reconciliationCase.findMany.mockResolvedValue([
      { orderId: 'order-1' },
      { orderId: 'order-1' },
      { orderId: 'order-2' },
    ]);
    prisma.orderFinancialFact.findMany.mockResolvedValue([
      {
        orderId: 'order-1',
        revenueAmount: new Prisma.Decimal('100.00'),
        cogsAmount: new Prisma.Decimal('40.00'),
        components: { freight: { amount: '8.00' } },
      },
      {
        orderId: 'order-2',
        revenueAmount: new Prisma.Decimal('30.00'),
        cogsAmount: new Prisma.Decimal('12.00'),
        components: { freight: { amount: '4.00' } },
      },
    ]);

    const dashboard = await service.getDashboard('tenant-1', 'account-1', {
      dateFrom: '2026-07-01T00:00:00.000Z',
      dateTo: '2026-07-31T23:59:59.999Z',
    });

    expect(prisma.providerSettlementEvent.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        operationalFinancialAccountId: 'account-1',
        occurredAt: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lte: new Date('2026-07-31T23:59:59.999Z'),
        },
      },
      select: expect.any(Object),
    });
    expect(prisma.reconciliationCase.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        orderId: { not: null },
        settlementEvent: {
          tenantId: 'tenant-1',
          operationalFinancialAccountId: 'account-1',
          occurredAt: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-31T23:59:59.999Z'),
          },
        },
      },
      select: { orderId: true },
    });
    expect(dashboard).toEqual({
      cashPosition: {
        openingBalanceMinor: '1000',
        currentBalanceMinor: '9600',
        releasedAmountMinor: '9500',
        pendingAmountMinor: '2850',
        blockedAmountMinor: '2000',
        refundedAmountMinor: '1000',
        payoutAmountMinor: '0',
        currency: 'BRL',
      },
      operationalPnl: {
        grossRevenueMinor: '13000',
        feeAmountMinor: '650',
        shippingAmountMinor: '1200',
        refundAmountMinor: '1000',
        cogsAmountMinor: '5200',
        netRevenueMinor: '11350',
        grossMarginMinor: '4950',
        matchedOrderCount: 2,
        currency: 'BRL',
      },
      note: 'Operational management view only. This is not official accounting.',
    });
  });
});
