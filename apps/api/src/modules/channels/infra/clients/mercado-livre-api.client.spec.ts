/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { MercadoLivreApiClient, MercadoLivreTokenRequestError } from './mercado-livre-api.client';

describe('MercadoLivreApiClient token lifecycle', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it('exchanges a refresh token using form encoded OAuth parameters', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 21600,
        user_id: 'seller-1',
      }),
    });

    await new MercadoLivreApiClient().refreshAccessToken({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'old-refresh-token',
    });

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe('https://api.mercadolibre.com/oauth/token');
    expect(request[1].method).toBe('POST');
    expect(request[1].body.toString()).toBe(
      'grant_type=refresh_token&client_id=client-id&client_secret=client-secret&refresh_token=old-refresh-token',
    );
  });

  it('returns a sanitized typed error without provider response secrets', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 });

    const request = new MercadoLivreApiClient().refreshAccessToken({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'secret-refresh-token',
    });

    await expect(request).rejects.toEqual(
      new MercadoLivreTokenRequestError('Mercado Livre token request failed.', 400),
    );
    await expect(request).rejects.not.toThrow('secret-refresh-token');
  });
});
