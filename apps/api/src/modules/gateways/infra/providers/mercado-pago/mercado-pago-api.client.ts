import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoOAuthTokenResponse, MercadoPagoCreatePaymentRequest, MercadoPagoPaymentResponse } from './mercado-pago.types';

export class MercadoPagoApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly response: any,
    message: string,
  ) {
    super(message);
    this.name = 'MercadoPagoApiError';
  }
}

@Injectable()
export class MercadoPagoApiClient {
  private readonly logger = new Logger(MercadoPagoApiClient.name);
  private readonly baseUrl = process.env.MERCADO_PAGO_BASE_URL || 'https://api.mercadopago.com';

  async exchangeAuthorizationCode(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string,
  ): Promise<MercadoPagoOAuthTokenResponse> {
    const payload = {
      client_secret: clientSecret,
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    };

    return this.post<MercadoPagoOAuthTokenResponse>('/oauth/token', payload);
  }

  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<MercadoPagoOAuthTokenResponse> {
    const payload = {
      client_secret: clientSecret,
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    return this.post<MercadoPagoOAuthTokenResponse>('/oauth/token', payload);
  }

  async createPayment(
    accessToken: string,
    payload: MercadoPagoCreatePaymentRequest,
    idempotencyKey?: string,
  ): Promise<MercadoPagoPaymentResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    return this.post<MercadoPagoPaymentResponse>('/v1/payments', payload, headers);
  }

  async getPayment(
    accessToken: string,
    providerPaymentId: string,
  ): Promise<MercadoPagoPaymentResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    return this.get<MercadoPagoPaymentResponse>(`/v1/payments/${providerPaymentId}`, headers);
  }

  private async post<T>(
    endpoint: string,
    payload: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('POST', endpoint, payload, headers);
  }

  private async get<T>(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    payload?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'LedgerFlow/1.0.0',
      ...headers,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        this.logger.error(`Mercado Pago API Error: [${response.status}] ${endpoint}`);
        throw new MercadoPagoApiError(response.status, data, `API Error ${response.status}`);
      }

      return data as T;
    } catch (error: any) {
      if (error instanceof MercadoPagoApiError) {
        throw error;
      }
      this.logger.error(`Network or Parsing error to Mercado Pago: ${error?.message}`);
      throw new Error(`Failed to call Mercado Pago API: ${error?.message}`);
    }
  }
}
