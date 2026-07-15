import { Injectable } from '@nestjs/common';

export interface MercadoLivreTokenExchangeInput {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface MercadoLivreTokenRefreshInput {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface MercadoLivreOAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user_id: number | string;
  scope?: string;
}

export class MercadoLivreTokenRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface MercadoLivreSearchItemsInput {
  accessToken: string;
  sellerId: string;
  limit: number;
  offset?: number;
  searchType?: 'scan';
  scrollId?: string;
  userProductId?: string;
}

export interface MercadoLivreSearchItemsResponse {
  results: string[];
  scroll_id?: string | null;
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

export interface MercadoLivreItemResponse {
  id: string;
  user_product_id?: string | null;
  title?: string;
  seller_custom_field?: string | null;
  status?: string;
  secure_thumbnail?: string;
  thumbnail?: string;
  attributes?: Array<{
    id?: string;
    name?: string;
    value_name?: string;
  }>;
}

export interface MercadoLivreOrderResponse {
  id: number | string;
  status?: string;
  date_created?: string;
  currency_id?: string;
  total_amount?: number | string;
  paid_amount?: number | string;
  shipping_cost?: number | string;
  coupon?: {
    amount?: number | string;
  };
  payments?: Array<{
    status?: string;
    total_paid_amount?: number | string;
    transaction_amount?: number | string;
    shipping_cost?: number | string;
    marketplace_fee?: number | string;
  }>;
  buyer?: {
    nickname?: string;
    first_name?: string;
    last_name?: string;
  };
  shipping?: {
    id?: number | string;
    status?: string;
    substatus?: string;
    mode?: string;
    logistic_type?: string;
    date_handling?: string;
    estimated_delivery?: {
      date?: string;
    };
    date_delivered?: string;
    tracking_number?: string;
  };
  order_items?: Array<{
    quantity?: number;
    sale_fee?: number | string;
    item?: {
      id?: string;
      title?: string;
    };
  }>;
}

export interface MercadoLivreUpdateItemStockInput {
  accessToken: string;
  externalListingId: string;
  availableQuantity: number;
}

export interface MercadoLivreUpdateItemStockResponse {
  id: string;
  available_quantity?: number;
  status?: string;
}

export interface MercadoLivreUserProductStockLocation {
  type: string;
  store_id?: string | number;
  network_node_id?: string;
  quantity?: number;
}

export interface MercadoLivreUserProductStockResponse {
  id: string;
  locations: MercadoLivreUserProductStockLocation[];
}

export interface MercadoLivreUpdateUserProductStockInput {
  accessToken: string;
  externalUserProductId: string;
  version: string;
  storeId: string;
  networkNodeId: string;
  availableQuantity: number;
}

@Injectable()
export class MercadoLivreApiClient {
  async exchangeAuthorizationCode(
    input: MercadoLivreTokenExchangeInput,
  ): Promise<MercadoLivreOAuthTokenResponse> {
    const baseUrl = process.env.MERCADO_LIVRE_API_BASE_URL ?? 'https://api.mercadolibre.com';
    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: input.code,
        redirect_uri: input.redirectUri,
      }),
      signal: this.requestSignal(),
    });

    if (!response.ok) throw this.tokenRequestError(response.status);

    return response.json() as Promise<MercadoLivreOAuthTokenResponse>;
  }

  async refreshAccessToken(
    input: MercadoLivreTokenRefreshInput,
  ): Promise<MercadoLivreOAuthTokenResponse> {
    const baseUrl = process.env.MERCADO_LIVRE_API_BASE_URL ?? 'https://api.mercadolibre.com';
    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken,
      }),
      signal: this.requestSignal(),
    });

    if (!response.ok) throw this.tokenRequestError(response.status);
    return response.json() as Promise<MercadoLivreOAuthTokenResponse>;
  }

  private tokenRequestError(status: number) {
    return new MercadoLivreTokenRequestError('Mercado Livre token request failed.', status);
  }

  async searchSellerItems(
    input: MercadoLivreSearchItemsInput,
  ): Promise<MercadoLivreSearchItemsResponse> {
    const baseUrl = process.env.MERCADO_LIVRE_API_BASE_URL ?? 'https://api.mercadolibre.com';
    const url = new URL(`${baseUrl}/users/${input.sellerId}/items/search`);
    url.searchParams.set('limit', String(input.limit));
    if (input.userProductId) url.searchParams.set('user_product_id', input.userProductId);
    if (input.searchType) url.searchParams.set('search_type', input.searchType);
    if (input.scrollId) url.searchParams.set('scroll_id', input.scrollId);
    else if (input.offset !== undefined) url.searchParams.set('offset', String(input.offset));

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${input.accessToken}` },
      signal: this.requestSignal(),
    });

    if (!response.ok) {
      throw new Error('Mercado Livre listing search failed.');
    }

    return response.json() as Promise<MercadoLivreSearchItemsResponse>;
  }

  async getItem(accessToken: string, itemId: string): Promise<MercadoLivreItemResponse> {
    const baseUrl = process.env.MERCADO_LIVRE_API_BASE_URL ?? 'https://api.mercadolibre.com';
    const response = await fetch(`${baseUrl}/items/${itemId}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: this.requestSignal(),
    });

    if (!response.ok) {
      throw new Error('Mercado Livre item detail failed.');
    }

    return response.json() as Promise<MercadoLivreItemResponse>;
  }

  async getOrder(accessToken: string, resource: string): Promise<MercadoLivreOrderResponse> {
    const baseUrl = process.env.MERCADO_LIVRE_API_BASE_URL ?? 'https://api.mercadolibre.com';
    const normalizedResource = resource.startsWith('/') ? resource : `/${resource}`;
    const response = await fetch(`${baseUrl}${normalizedResource}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: this.requestSignal(),
    });

    if (!response.ok) {
      throw new Error('Mercado Livre order detail failed.');
    }

    return response.json() as Promise<MercadoLivreOrderResponse>;
  }

  async updateItemStock(
    input: MercadoLivreUpdateItemStockInput,
  ): Promise<MercadoLivreUpdateItemStockResponse> {
    const baseUrl = process.env.MERCADO_LIVRE_API_BASE_URL ?? 'https://api.mercadolibre.com';
    const response = await fetch(`${baseUrl}/items/${input.externalListingId}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ available_quantity: input.availableQuantity }),
      signal: this.requestSignal(),
    });

    if (!response.ok) {
      const error = new Error('Mercado Livre listing stock update failed.') as Error & {
        status?: number;
        retryAfterSeconds?: number;
      };
      error.status = response.status;
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        const retryAfterSeconds = Number(retryAfter);
        if (Number.isFinite(retryAfterSeconds)) error.retryAfterSeconds = retryAfterSeconds;
      }
      throw error;
    }

    return response.json() as Promise<MercadoLivreUpdateItemStockResponse>;
  }

  async getUserProductStock(accessToken: string, externalUserProductId: string) {
    const baseUrl = process.env.MERCADO_LIVRE_API_BASE_URL ?? 'https://api.mercadolibre.com';
    const response = await fetch(`${baseUrl}/user-products/${externalUserProductId}/stock`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: this.requestSignal(),
    });

    if (!response.ok)
      throw this.providerRequestError('User Product stock lookup failed.', response);

    return {
      data: (await response.json()) as MercadoLivreUserProductStockResponse,
      version: response.headers.get('x-version'),
    };
  }

  async updateUserProductSellerWarehouseStock(
    input: MercadoLivreUpdateUserProductStockInput,
  ): Promise<void> {
    const baseUrl = process.env.MERCADO_LIVRE_API_BASE_URL ?? 'https://api.mercadolibre.com';
    const response = await fetch(
      `${baseUrl}/user-products/${input.externalUserProductId}/stock/type/seller_warehouse`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json',
          'x-version': input.version,
        },
        body: JSON.stringify({
          locations: [
            {
              store_id: input.storeId,
              network_node_id: input.networkNodeId,
              quantity: input.availableQuantity,
            },
          ],
        }),
        signal: this.requestSignal(),
      },
    );

    if (!response.ok)
      throw this.providerRequestError('User Product stock update failed.', response);
  }

  private providerRequestError(message: string, response: Response) {
    const error = new Error(message) as Error & { status?: number; retryAfterSeconds?: number };
    error.status = response.status;
    const retryAfter = Number(response.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfterSeconds = retryAfter;
    return error;
  }

  private requestSignal() {
    const configuredTimeout = Number(process.env.MERCADO_LIVRE_HTTP_TIMEOUT_MS);
    const timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15_000;
    return AbortSignal.timeout(timeoutMs);
  }
}
