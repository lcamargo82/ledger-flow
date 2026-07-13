import {
  GatewayConfigurationStatus,
  GatewayEnvironment,
  GatewayHealthStatus,
  PaymentProvider,
} from '@prisma/client';
import { GatewayConnectionsService } from './gateway-connections.service';
import { MercadoPagoFinancialReadinessService } from './mercado-pago-financial-readiness.service';

describe('GatewayConnectionsService financial readiness', () => {
  const reauthRequiredStatus = 'REAUTH_REQUIRED' as GatewayConfigurationStatus;
  const prisma = {
    gatewayConfiguration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const encryption = {
    decrypt: jest.fn(),
    encrypt: jest.fn(),
    createFingerprint: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks Mercado Pago as payment-only when financial scopes are missing', async () => {
    prisma.gatewayConfiguration.findMany.mockResolvedValue([
      mercadoPagoConnection({
        encryptedCredentials: 'encrypted-payment-only',
      }),
    ]);
    encryption.decrypt.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenExpiresAt: '2026-07-13T13:00:00.000Z',
      merchantId: '123',
      scope: 'offline_access',
    });

    const [connection] = await service().listConnections('tenant-1');

    expect(connection.financialReadiness).toMatchObject({
      state: 'PAYMENT_ONLY',
      canReadSettlements: false,
      requiredScopes: ['offline_access', 'read'],
      grantedScopes: ['offline_access'],
      missingScopes: ['read'],
      reason: 'MERCADO_PAGO_FINANCIAL_SCOPE_MISSING',
    });
  });

  it('marks Mercado Pago as settlement-ready when required scopes and health are valid', async () => {
    prisma.gatewayConfiguration.findMany.mockResolvedValue([
      mercadoPagoConnection({
        encryptedCredentials: 'encrypted-settlement-ready',
        healthStatus: GatewayHealthStatus.HEALTHY,
      }),
    ]);
    encryption.decrypt.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenExpiresAt: '2026-07-13T13:00:00.000Z',
      merchantId: '123',
      scope: 'read offline_access',
    });

    const [connection] = await service().listConnections('tenant-1');

    expect(connection.financialReadiness).toMatchObject({
      state: 'SETTLEMENT_READY',
      canReadSettlements: true,
      grantedScopes: ['offline_access', 'read'],
      missingScopes: [],
    });
  });

  it('blocks financial sync when Mercado Pago requires reauthorization', async () => {
    prisma.gatewayConfiguration.findMany.mockResolvedValue([
      mercadoPagoConnection({
        encryptedCredentials: 'encrypted-reauth',
        status: reauthRequiredStatus,
        healthStatus: GatewayHealthStatus.DEGRADED,
        lastHealthCheckMessage: 'MERCADO_PAGO_REAUTH_REQUIRED',
      }),
    ]);
    encryption.decrypt.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenExpiresAt: '2026-07-13T13:00:00.000Z',
      merchantId: '123',
      scope: 'read offline_access',
    });

    const [connection] = await service().listConnections('tenant-1');

    expect(connection.financialReadiness).toMatchObject({
      state: 'REAUTH_REQUIRED',
      canReadSettlements: false,
      missingScopes: [],
      reason: 'MERCADO_PAGO_REAUTH_REQUIRED',
    });
  });

  it('exposes unhealthy Mercado Pago connections as blocked for financial reads', async () => {
    prisma.gatewayConfiguration.findMany.mockResolvedValue([
      mercadoPagoConnection({
        encryptedCredentials: 'encrypted-unhealthy',
        healthStatus: GatewayHealthStatus.UNHEALTHY,
        lastHealthCheckMessage: 'MERCADO_PAGO_REFRESH_TRANSIENT_FAILURE',
      }),
    ]);
    encryption.decrypt.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenExpiresAt: '2026-07-13T13:00:00.000Z',
      merchantId: '123',
      scope: 'read offline_access',
    });

    const [connection] = await service().listConnections('tenant-1');

    expect(connection.financialReadiness).toMatchObject({
      state: 'UNHEALTHY',
      canReadSettlements: false,
      missingScopes: [],
      reason: 'MERCADO_PAGO_REFRESH_TRANSIENT_FAILURE',
    });
  });

  it('throws when a future financial sync tries to use an unhealthy connection', () => {
    const readiness = new MercadoPagoFinancialReadinessService(encryption as never);
    encryption.decrypt.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenExpiresAt: '2026-07-13T13:00:00.000Z',
      merchantId: '123',
      scope: 'read offline_access',
    });

    expect(() =>
      readiness.assertSettlementReadable(
        mercadoPagoConnection({
          encryptedCredentials: 'encrypted-unhealthy',
          healthStatus: GatewayHealthStatus.UNHEALTHY,
          lastHealthCheckMessage: 'MERCADO_PAGO_REFRESH_TRANSIENT_FAILURE',
        }) as never,
      ),
    ).toThrow('MERCADO_PAGO_REFRESH_TRANSIENT_FAILURE');
  });

  it('does not expose financial readiness for providers outside Mercado Pago', async () => {
    prisma.gatewayConfiguration.findMany.mockResolvedValue([
      {
        ...mercadoPagoConnection({}),
        provider: PaymentProvider.ASAAS,
        encryptedCredentials: 'encrypted-asaas',
      },
    ]);

    const [connection] = await service().listConnections('tenant-1');

    expect(connection.financialReadiness).toBeUndefined();
    expect(encryption.decrypt).not.toHaveBeenCalled();
  });

  function service() {
    const readiness = new MercadoPagoFinancialReadinessService(encryption as never);
    return new GatewayConnectionsService(prisma as never, encryption as never, readiness);
  }
});

function mercadoPagoConnection(overrides: Record<string, unknown>) {
  return {
    id: 'gateway-1',
    tenantId: 'tenant-1',
    provider: PaymentProvider.MERCADO_PAGO,
    environment: GatewayEnvironment.TEST,
    status: GatewayConfigurationStatus.ACTIVE,
    priority: 1,
    displayName: 'Mercado Pago',
    supportedMethods: ['PIX', 'BOLETO'],
    encryptedCredentials: null,
    credentialsFingerprint: 'mp_123',
    healthStatus: GatewayHealthStatus.HEALTHY,
    lastHealthCheckAt: new Date('2026-07-13T12:00:00.000Z'),
    lastHealthCheckMessage: null,
    createdAt: new Date('2026-07-13T10:00:00.000Z'),
    updatedAt: new Date('2026-07-13T10:00:00.000Z'),
    ...overrides,
  };
}
