import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MarketplaceFinancialIngestionService } from './marketplace-financial-ingestion.service';

describe('MarketplaceFinancialIngestionService', () => {
  const account = {
    id: 'account-1',
    tenantId: 'tenant-1',
    gatewayConfigurationId: 'gateway-1',
    provider: 'MERCADO_PAGO',
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
        },
      }),
    };

    return {
      prisma,
      readiness,
      credentialManager,
      mercadoPagoRead,
      reconciliationIngestion,
      service: new MarketplaceFinancialIngestionService(
        (overrides.prisma as never) ?? (prisma as never),
        (overrides.readiness as never) ?? (readiness as never),
        (overrides.credentialManager as never) ?? (credentialManager as never),
        (overrides.mercadoPagoRead as never) ?? (mercadoPagoRead as never),
        (overrides.reconciliationIngestion as never) ?? (reconciliationIngestion as never),
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
    const { service, prisma } = makeService({ reconciliationIngestion });

    const result = await service.syncMercadoPagoByPeriod('tenant-1', 'user-1', 'account-1', {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
      maxPages: 1,
    });

    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
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
});
