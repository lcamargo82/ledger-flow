import { Injectable } from '@nestjs/common';

export interface MercadoLivreTokenExchangeInput {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface MercadoLivreOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number | string;
  scope?: string;
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
    });

    if (!response.ok) {
      throw new Error('Mercado Livre token exchange failed.');
    }

    return response.json() as Promise<MercadoLivreOAuthTokenResponse>;
  }
}
