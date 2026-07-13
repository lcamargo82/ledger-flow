import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  GatewayConfigurationStatus,
  GatewayEnvironment,
  GatewayHealthStatus,
  PaymentProvider,
} from '@prisma/client';
import { MarketplaceFinancialAccountsService } from './marketplace-financial-accounts.service';

describe('MarketplaceFinancialAccountsService', () => {
  const gatewayConfiguration = {
    id: 'gateway-1',
    tenantId: 'tenant-1',
    provider: PaymentProvider.MERCADO_PAGO,
    environment: GatewayEnvironment.LIVE,
    status: GatewayConfigurationStatus.ACTIVE,
    priority: 100,
    displayName: 'Mercado Pago',
    supportedMethods: null,
    encryptedCredentials: 'encrypted',
    credentialsFingerprint: 'fingerprint',
    healthStatus: GatewayHealthStatus.HEALTHY,
    lastHealthCheckAt: null,
    lastHealthCheckMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const makePrisma = () => {
    const tx = {
      operationalFinancialAccount: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'account-1',
            ...data,
            status: 'ACTIVE',
            createdAt: new Date('2026-07-13T10:00:00.000Z'),
            updatedAt: new Date('2026-07-13T10:00:00.000Z'),
            archivedAt: null,
          }),
        ),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      cashLedgerEntry: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'ledger-1',
            ...data,
            createdAt: new Date('2026-07-13T10:00:00.000Z'),
          }),
        ),
      },
      cashPositionAdjustment: {
        create: jest.fn().mockResolvedValue({ id: 'adjustment-1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    return {
      tx,
      prisma: {
        gatewayConfiguration: {
          findFirst: jest.fn().mockResolvedValue(gatewayConfiguration),
        },
        operationalFinancialAccount: {
          findUnique: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(tx)),
      },
    };
  };

  it('creates a Mercado Pago financial account with append-only opening ledger and audit', async () => {
    const { prisma, tx } = makePrisma();
    const readiness = { assertSettlementReadable: jest.fn() };
    const service = new MarketplaceFinancialAccountsService(prisma as never, readiness as never);

    const result = await service.createAccount('tenant-1', 'user-1', {
      provider: PaymentProvider.MERCADO_PAGO,
      gatewayConfigurationId: 'gateway-1',
      name: 'Mercado Pago Principal',
      openingBalanceMinor: 125000,
      reasonCode: 'initial_import',
      notes: 'Checked statement.',
    });

    expect(readiness.assertSettlementReadable).toHaveBeenCalledWith(gatewayConfiguration);
    expect(tx.operationalFinancialAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          gatewayConfigurationId: 'gateway-1',
          provider: PaymentProvider.MERCADO_PAGO,
          currentBalanceMinor: expect.anything(),
          openingBalanceMinor: expect.anything(),
        }),
      }),
    );
    expect(tx.cashLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'OPENING_BALANCE',
          amountMinor: expect.anything(),
          balanceAfterMinor: expect.anything(),
          reasonCode: 'initial_import',
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'marketplace_settlement.financial_account.created',
          entityId: 'account-1',
        }),
      }),
    );
    expect(result.account.id).toBe('account-1');
    expect(result.ledgerEntry.id).toBe('ledger-1');
  });

  it('blocks account creation when Mercado Pago is not settlement-readable', async () => {
    const { prisma } = makePrisma();
    const readiness = {
      assertSettlementReadable: jest.fn(() => {
        throw new Error('MERCADO_PAGO_FINANCIAL_SCOPE_MISSING');
      }),
    };
    const service = new MarketplaceFinancialAccountsService(prisma as never, readiness as never);

    await expect(
      service.createAccount('tenant-1', 'user-1', {
        provider: PaymentProvider.MERCADO_PAGO,
        gatewayConfigurationId: 'gateway-1',
        name: 'Mercado Pago Principal',
        openingBalanceMinor: 0,
        reasonCode: 'initial_import',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicated account names per tenant', async () => {
    const { prisma } = makePrisma();
    prisma.operationalFinancialAccount.findUnique.mockResolvedValue({ id: 'existing-account' });
    const service = new MarketplaceFinancialAccountsService(
      prisma as never,
      {
        assertSettlementReadable: jest.fn(),
      } as never,
    );

    await expect(
      service.createAccount('tenant-1', 'user-1', {
        provider: PaymentProvider.MERCADO_PAGO,
        gatewayConfigurationId: 'gateway-1',
        name: 'Mercado Pago Principal',
        openingBalanceMinor: 0,
        reasonCode: 'initial_import',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
