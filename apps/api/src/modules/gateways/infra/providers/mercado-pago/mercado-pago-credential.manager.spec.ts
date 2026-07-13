import { GatewayConfigurationStatus, GatewayHealthStatus, PaymentProvider } from '@prisma/client';
import { MercadoPagoApiError } from './mercado-pago-api.client';
import { MercadoPagoCredentialManager } from './mercado-pago-credential.manager';

const redisSet = jest.fn();
const redisEval = jest.fn();
const redisOn = jest.fn();

jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    set: redisSet,
    eval: redisEval,
    on: redisOn,
  })),
);

describe('MercadoPagoCredentialManager', () => {
  const now = new Date('2026-07-13T12:00:00.000Z');
  let prisma: any;
  let encryption: any;
  let apiClient: any;
  let moduleRef: any;
  let notifications: any;
  let config: any;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    redisSet.mockResolvedValue('OK');
    redisEval.mockResolvedValue(1);

    prisma = {
      gatewayConfiguration: {
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };
    encryption = {
      decrypt: jest.fn(),
      encrypt: jest.fn().mockReturnValue({
        version: 1,
        algorithm: 'aes-256-gcm',
        iv: 'iv',
        authTag: 'tag',
        ciphertext: 'cipher',
      }),
    };
    apiClient = {
      refreshAccessToken: jest.fn(),
    };
    notifications = {
      mercadoPagoConnectionReauthRequired: jest.fn(),
    };
    moduleRef = {
      get: jest.fn().mockReturnValue(notifications),
    };
    config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          REDIS_URL: 'redis://localhost:6379',
          MERCADO_PAGO_CLIENT_ID: 'client-id',
          MERCADO_PAGO_CLIENT_SECRET: 'client-secret',
        };
        return values[key];
      }),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns current credentials when the token is still valid', async () => {
    prisma.gatewayConfiguration.findFirst.mockResolvedValue({
      id: 'config-1',
      tenantId: 'tenant-1',
      provider: PaymentProvider.MERCADO_PAGO,
      status: GatewayConfigurationStatus.ACTIVE,
      encryptedCredentials: 'encrypted-current',
    });
    encryption.decrypt.mockReturnValue({
      accessToken: 'access-current',
      refreshToken: 'refresh-current',
      tokenExpiresAt: '2026-07-13T12:30:00.000Z',
      merchantId: 'merchant-1',
    });

    const manager = createManager(prisma, encryption, apiClient, moduleRef, config);

    await expect(
      manager.getValidAccessToken({
        tenantId: 'tenant-1',
        gatewayConfigurationId: 'config-1',
        purpose: 'PAYMENT',
      }),
    ).resolves.toBe('access-current');

    expect(apiClient.refreshAccessToken).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('refreshes and persists credentials before expiration', async () => {
    prisma.gatewayConfiguration.findFirst
      .mockResolvedValueOnce({
        id: 'config-1',
        tenantId: 'tenant-1',
        provider: PaymentProvider.MERCADO_PAGO,
        status: GatewayConfigurationStatus.ACTIVE,
        encryptedCredentials: 'encrypted-old',
      })
      .mockResolvedValueOnce({
        id: 'config-1',
        tenantId: 'tenant-1',
        provider: PaymentProvider.MERCADO_PAGO,
        status: GatewayConfigurationStatus.ACTIVE,
        encryptedCredentials: 'encrypted-old',
      });
    encryption.decrypt.mockReturnValue({
      accessToken: 'access-old',
      refreshToken: 'refresh-old',
      tokenExpiresAt: '2026-07-13T12:05:00.000Z',
      merchantId: '123',
      scope: 'offline_access read',
    });
    apiClient.refreshAccessToken.mockResolvedValue({
      access_token: 'access-new',
      refresh_token: 'refresh-new',
      expires_in: 3600,
      scope: 'offline_access read',
      user_id: 123,
    });
    prisma.gatewayConfiguration.updateMany.mockResolvedValue({ count: 1 });

    const manager = createManager(prisma, encryption, apiClient, moduleRef, config);

    await expect(
      manager.getValidCredentials({
        tenantId: 'tenant-1',
        gatewayConfigurationId: 'config-1',
        purpose: 'PAYMENT',
      }),
    ).resolves.toMatchObject({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
      merchantId: '123',
    });

    expect(redisSet).toHaveBeenCalledWith(
      'lock:mercado-pago:refresh:config-1',
      expect.any(String),
      'EX',
      30,
      'NX',
    );
    expect(apiClient.refreshAccessToken).toHaveBeenCalledWith(
      'refresh-old',
      'client-id',
      'client-secret',
    );
    expect(prisma.gatewayConfiguration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          encryptedCredentials: 'encrypted-old',
        }),
        data: expect.objectContaining({
          healthStatus: GatewayHealthStatus.HEALTHY,
          lastHealthCheckMessage: 'MERCADO_PAGO_TOKEN_REFRESHED',
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'mercado_pago.oauth.token_refreshed',
          metadata: { provider: PaymentProvider.MERCADO_PAGO },
        }),
      }),
    );
  });

  it('marks the connection as reauth required when the refresh token is invalid', async () => {
    prisma.gatewayConfiguration.findFirst
      .mockResolvedValueOnce({
        id: 'config-1',
        tenantId: 'tenant-1',
        provider: PaymentProvider.MERCADO_PAGO,
        status: GatewayConfigurationStatus.ACTIVE,
        encryptedCredentials: 'encrypted-old',
      })
      .mockResolvedValueOnce({
        id: 'config-1',
        tenantId: 'tenant-1',
        provider: PaymentProvider.MERCADO_PAGO,
        status: GatewayConfigurationStatus.ACTIVE,
        encryptedCredentials: 'encrypted-old',
      });
    encryption.decrypt.mockReturnValue({
      accessToken: 'access-old',
      refreshToken: 'refresh-old',
      tokenExpiresAt: '2026-07-13T12:05:00.000Z',
      merchantId: '123',
    });
    apiClient.refreshAccessToken.mockRejectedValue(
      new MercadoPagoApiError(401, { message: 'invalid_grant' }, 'API Error 401'),
    );

    const manager = createManager(prisma, encryption, apiClient, moduleRef, config);

    await expect(
      manager.getValidCredentials({
        tenantId: 'tenant-1',
        gatewayConfigurationId: 'config-1',
        purpose: 'PAYMENT',
      }),
    ).rejects.toThrow('Mercado Pago connection requires reconnection.');

    expect(prisma.gatewayConfiguration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'config-1' },
        data: expect.objectContaining({
          status: 'REAUTH_REQUIRED',
          healthStatus: GatewayHealthStatus.DEGRADED,
          lastHealthCheckMessage: 'MERCADO_PAGO_REAUTH_REQUIRED',
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'mercado_pago.connection_reauth_required',
          metadata: { provider: PaymentProvider.MERCADO_PAGO },
        }),
      }),
    );
    expect(notifications.mercadoPagoConnectionReauthRequired).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      gatewayConfigurationId: 'config-1',
    });
  });
});

function createManager(
  prisma: any,
  encryption: any,
  apiClient: any,
  moduleRef: any,
  config: any,
) {
  return new MercadoPagoCredentialManager(
    prisma,
    encryption,
    apiClient,
    moduleRef,
    config,
  );
}
