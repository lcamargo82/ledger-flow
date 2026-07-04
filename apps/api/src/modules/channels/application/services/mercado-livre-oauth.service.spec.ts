import { BadRequestException } from '@nestjs/common';
import { ChannelIntegrationStatus, ChannelProvider } from '@prisma/client';
import { MercadoLivreOAuthService } from './mercado-livre-oauth.service';

describe('MercadoLivreOAuthService', () => {
  const apiClient = {
    exchangeAuthorizationCode: jest.fn(),
  };
  const stateService = {
    generateState: jest.fn(),
    validateAndConsumeState: jest.fn(),
  };
  const encryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    createFingerprint: jest.fn(),
  };
  const prisma = {
    channelIntegration: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MERCADO_LIVRE_CLIENT_ID = 'ml-client-id';
    process.env.MERCADO_LIVRE_CLIENT_SECRET = 'ml-client-secret';
    process.env.MERCADO_LIVRE_OAUTH_BASE_URL = 'https://auth.mercadolivre.com.br';
    process.env.MERCADO_LIVRE_CALLBACK_BASE_URL = 'https://app.ledgerflow.test';
    stateService.generateState.mockResolvedValue('secure-state');
    stateService.validateAndConsumeState.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
    });
    apiClient.exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'ml-access-token',
      refresh_token: 'ml-refresh-token',
      expires_in: 21600,
      user_id: 123456,
      scope: 'read write',
    });
    encryptionService.encrypt.mockReturnValue({
      version: 1,
      algorithm: 'aes-256-gcm',
      iv: 'iv',
      authTag: 'tag',
      ciphertext: 'ciphertext',
    });
    encryptionService.decrypt.mockReturnValue({
      accessToken: 'ml-access-token',
      refreshToken: 'ml-refresh-token',
      externalAccountId: '123456',
    });
    encryptionService.createFingerprint.mockReturnValue('fingerprint-123');
    prisma.channelIntegration.upsert.mockResolvedValue({
      id: 'integration-1',
      tenantId: 'tenant-1',
      provider: ChannelProvider.MERCADO_LIVRE,
      externalAccountId: '123456',
      status: ChannelIntegrationStatus.ACTIVE,
    });
  });

  afterEach(() => {
    delete process.env.MERCADO_LIVRE_CLIENT_ID;
    delete process.env.MERCADO_LIVRE_CLIENT_SECRET;
    delete process.env.MERCADO_LIVRE_OAUTH_BASE_URL;
    delete process.env.MERCADO_LIVRE_CALLBACK_BASE_URL;
  });

  function makeService() {
    return new MercadoLivreOAuthService(
      apiClient as never,
      stateService as never,
      encryptionService as never,
      prisma as never,
    );
  }

  it('generates a tenant-bound authorization URL without tenant tokens', async () => {
    const service = makeService();

    const result = await service.generateAuthorizationUrl('tenant-1', 'user-1');

    expect(stateService.generateState).toHaveBeenCalledWith('tenant-1', 'user-1');
    expect(result.authorizationUrl).toContain('client_id=ml-client-id');
    expect(result.authorizationUrl).toContain('state=secure-state');
    expect(result.authorizationUrl).toContain('redirect_uri=https%3A%2F%2Fapp.ledgerflow.test%2Fchannels%2Fmercado-livre%2Fcallback');
    expect(result.authorizationUrl).not.toContain('access');
    expect(result.authorizationUrl).not.toContain('refresh');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'channels.mercado_livre.oauth.connection_requested',
        metadata: { provider: ChannelProvider.MERCADO_LIVRE },
      }),
    });
  });

  it('exchanges callback code and stores encrypted credentials only in ChannelIntegration', async () => {
    const service = makeService();

    const result = await service.handleCallback('auth-code', 'secure-state');

    expect(apiClient.exchangeAuthorizationCode).toHaveBeenCalledWith({
      code: 'auth-code',
      clientId: 'ml-client-id',
      clientSecret: 'ml-client-secret',
      redirectUri: 'https://app.ledgerflow.test/channels/mercado-livre/callback',
    });
    expect(encryptionService.encrypt).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'ml-access-token',
        refreshToken: 'ml-refresh-token',
        externalAccountId: '123456',
      }),
    );
    expect(encryptionService.decrypt).toHaveBeenCalledWith(
      JSON.stringify({
        version: 1,
        algorithm: 'aes-256-gcm',
        iv: 'iv',
        authTag: 'tag',
        ciphertext: 'ciphertext',
      }),
    );
    expect(prisma.channelIntegration.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_provider_externalAccountId: {
          tenantId: 'tenant-1',
          provider: ChannelProvider.MERCADO_LIVRE,
          externalAccountId: '123456',
        },
      },
      create: expect.objectContaining({
        encryptedCredentials: {
          version: 1,
          algorithm: 'aes-256-gcm',
          iv: 'iv',
          authTag: 'tag',
          ciphertext: 'ciphertext',
        },
        credentialsFingerprint: 'fingerprint-123',
        credentialsVersion: 1,
        status: ChannelIntegrationStatus.ACTIVE,
      }),
      update: expect.objectContaining({
        encryptedCredentials: {
          version: 1,
          algorithm: 'aes-256-gcm',
          iv: 'iv',
          authTag: 'tag',
          ciphertext: 'ciphertext',
        },
        credentialsFingerprint: 'fingerprint-123',
        status: ChannelIntegrationStatus.ACTIVE,
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'channels.mercado_livre.oauth.connection_succeeded',
        metadata: {
          provider: ChannelProvider.MERCADO_LIVRE,
          externalAccountId: '123456',
        },
      }),
    });
    expect(result).toEqual({ integrationId: 'integration-1', status: ChannelIntegrationStatus.ACTIVE });
  });

  it('fails closed when OAuth state is invalid or already consumed', async () => {
    stateService.validateAndConsumeState.mockResolvedValue(null);
    const service = makeService();

    await expect(service.handleCallback('auth-code', 'bad-state')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(apiClient.exchangeAuthorizationCode).not.toHaveBeenCalled();
  });
});
