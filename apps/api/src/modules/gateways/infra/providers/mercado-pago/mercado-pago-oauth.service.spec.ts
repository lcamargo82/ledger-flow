import { GatewayEnvironment, GatewayConfigurationStatus, PaymentMethod, PaymentProvider } from '@prisma/client';
import { MercadoPagoOAuthService } from './mercado-pago-oauth.service';

describe('MercadoPagoOAuthService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      MERCADO_PAGO_CLIENT_ID: 'client-id',
      MERCADO_PAGO_CLIENT_SECRET: 'client-secret',
      MERCADO_PAGO_OAUTH_REDIRECT_URI: 'https://api.example.test/gateways/mercado-pago/oauth/callback',
      MERCADO_PAGO_TEST_MODE: 'false',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('stores Mercado Pago OAuth connections with PIX and BOLETO supported methods', async () => {
    const apiClient = {
      exchangeAuthorizationCode: jest.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user_id: 12345,
        scope: 'read write offline_access',
      }),
    };
    const stateService = {
      validateAndConsumeState: jest.fn().mockResolvedValue({
        tenantId: 'tenant-1',
        userId: 'user-1',
      }),
    };
    const gatewayConfigRepo = {
      findActiveByTenantAndProvider: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'gateway-1' }),
    };
    const encryptionService = {
      encrypt: jest.fn().mockReturnValue({
        iv: 'iv',
        authTag: 'auth-tag',
        encryptedData: 'encrypted-data',
      }),
    };
    const prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const service = new MercadoPagoOAuthService(
      apiClient as never,
      stateService as never,
      gatewayConfigRepo as never,
      encryptionService as never,
      prisma as never,
    );

    await service.handleCallback('code-1', 'state-1');

    expect(gatewayConfigRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        provider: PaymentProvider.MERCADO_PAGO,
        environment: GatewayEnvironment.LIVE,
        status: GatewayConfigurationStatus.ACTIVE,
        displayName: 'Mercado Pago',
        supportedMethods: [PaymentMethod.PIX, PaymentMethod.BOLETO],
      }),
    );
  });
});
