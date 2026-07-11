/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ChannelIntegrationStatus, ChannelProvider } from '@prisma/client';
import { MercadoLivreTokenRequestError } from '../../infra/clients/mercado-livre-api.client';
import { MercadoLivreCredentialsService } from './mercado-livre-credentials.service';

describe('MercadoLivreCredentialsService', () => {
  const apiClient = { refreshAccessToken: jest.fn() };
  const encryptionService = {
    decrypt: jest.fn(),
    encrypt: jest.fn(),
    createFingerprint: jest.fn(),
  };
  const prisma = {
    channelIntegration: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const integration = {
    id: 'integration-1',
    tenantId: 'tenant-1',
    provider: ChannelProvider.MERCADO_LIVRE,
    status: ChannelIntegrationStatus.ACTIVE,
    credentialsVersion: 2,
    encryptedCredentials: { ciphertext: 'old' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MERCADO_LIVRE_CLIENT_ID = 'client-id';
    process.env.MERCADO_LIVRE_CLIENT_SECRET = 'client-secret';
    encryptionService.encrypt.mockReturnValue({ ciphertext: 'new' });
    encryptionService.createFingerprint.mockReturnValue('new-fingerprint');
    prisma.channelIntegration.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    delete process.env.MERCADO_LIVRE_CLIENT_ID;
    delete process.env.MERCADO_LIVRE_CLIENT_SECRET;
  });

  const makeService = () =>
    new MercadoLivreCredentialsService(apiClient as never, encryptionService, prisma as never);

  it('returns a token that is not close to expiration without refreshing it', async () => {
    encryptionService.decrypt.mockReturnValue({
      accessToken: 'current-token',
      refreshToken: 'refresh-token',
      tokenExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    });

    await expect(makeService().getAccessToken(integration as never)).resolves.toBe('current-token');
    expect(apiClient.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes and atomically persists credentials before expiration', async () => {
    encryptionService.decrypt.mockReturnValue({
      accessToken: 'expired-token',
      refreshToken: 'old-refresh-token',
      tokenExpiresAt: new Date(Date.now() - 1_000).toISOString(),
      externalAccountId: 'seller-1',
      provider: ChannelProvider.MERCADO_LIVRE,
    });
    apiClient.refreshAccessToken.mockResolvedValue({
      access_token: 'new-access-token',
      expires_in: 21600,
      user_id: 'seller-1',
      scope: 'read write',
    });

    await expect(makeService().getAccessToken(integration as never)).resolves.toBe(
      'new-access-token',
    );
    expect(apiClient.refreshAccessToken).toHaveBeenCalledWith({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'old-refresh-token',
    });
    expect(encryptionService.encrypt).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'new-access-token',
        refreshToken: 'old-refresh-token',
        externalAccountId: 'seller-1',
      }),
    );
    expect(prisma.channelIntegration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'integration-1', credentialsVersion: 2 }),
        data: expect.objectContaining({
          credentialsVersion: { increment: 1 },
          credentialsFingerprint: 'new-fingerprint',
        }),
      }),
    );
  });

  it('marks the integration for reauthentication when refresh is rejected', async () => {
    encryptionService.decrypt.mockReturnValue({
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh-token',
      tokenExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    });
    apiClient.refreshAccessToken.mockRejectedValue(
      new MercadoLivreTokenRequestError('Mercado Livre token request failed.', 400),
    );

    await expect(makeService().getAccessToken(integration as never)).rejects.toThrow(
      'Mercado Livre authorization must be renewed.',
    );
    expect(prisma.channelIntegration.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'integration-1',
        tenantId: 'tenant-1',
        provider: ChannelProvider.MERCADO_LIVRE,
      },
      data: expect.objectContaining({ status: ChannelIntegrationStatus.REAUTH_REQUIRED }),
    });
  });
});
