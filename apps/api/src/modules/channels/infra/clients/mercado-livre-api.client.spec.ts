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

  it('uses scan pagination with a scroll cursor and without offset', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        results: ['MLB-1'],
        scroll_id: 'cursor-1',
        paging: { total: 1, offset: 0, limit: 100 },
      }),
    });

    await new MercadoLivreApiClient().searchSellerItems({
      accessToken: 'access-token',
      sellerId: 'seller-1',
      limit: 100,
      searchType: 'scan',
      scrollId: 'cursor-1',
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/users/seller-1/items/search');
    expect(requestUrl.searchParams.get('limit')).toBe('100');
    expect(requestUrl.searchParams.get('search_type')).toBe('scan');
    expect(requestUrl.searchParams.get('scroll_id')).toBe('cursor-1');
    expect(requestUrl.searchParams.has('offset')).toBe(false);
  });
});
