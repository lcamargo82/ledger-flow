import { Injectable, Logger } from '@nestjs/common';
import {
  MercadoPagoOAuthTokenResponse,
  MercadoPagoCreatePaymentRequest,
  MercadoPagoPaymentResponse,
  MercadoPagoPaymentSearchResponse,
  MercadoPagoRefundResponse,
} from './mercado-pago.types';

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

  async searchPayments(
    accessToken: string,
    input: {
      from?: Date;
      to?: Date;
      offset?: number;
      limit?: number;
      sort?: 'date_created' | 'date_last_updated';
      criteria?: 'asc' | 'desc';
    },
  ): Promise<MercadoPagoPaymentSearchResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    const params = new URLSearchParams();
    params.set('sort', input.sort ?? 'date_created');
    params.set('criteria', input.criteria ?? 'asc');
    params.set('limit', String(input.limit ?? 50));
    params.set('offset', String(input.offset ?? 0));

    if (input.from || input.to) {
      params.set('range', input.sort ?? 'date_created');
      if (input.from) params.set('begin_date', input.from.toISOString());
      if (input.to) params.set('end_date', input.to.toISOString());
    }

    return this.get<MercadoPagoPaymentSearchResponse>(`/v1/payments/search?${params}`, headers);
  }

  async cancelPayment(
    accessToken: string,
    providerPaymentId: string,
    idempotencyKey?: string,
  ): Promise<MercadoPagoPaymentResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    return this.put<MercadoPagoPaymentResponse>(
      `/v1/payments/${providerPaymentId}`,
      { status: 'cancelled' },
      headers,
    );
  }

  async refundPayment(
    accessToken: string,
    providerPaymentId: string,
    input?: { amount?: number; idempotencyKey?: string },
  ): Promise<MercadoPagoRefundResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (input?.idempotencyKey) {
      headers['X-Idempotency-Key'] = input.idempotencyKey;
    }

    const payload = input?.amount ? { amount: input.amount } : {};
    return this.post<MercadoPagoRefundResponse>(
      `/v1/payments/${providerPaymentId}/refunds`,
      payload,
      headers,
    );
  }

  private async post<T>(
    endpoint: string,
    payload: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('POST', endpoint, payload, headers);
  }

  private async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  private async put<T>(
    endpoint: string,
    payload: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, payload, headers);
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
    } catch (error: unknown) {
      if (error instanceof MercadoPagoApiError) {
        throw error;
      }
      const err = error as Error;
      this.logger.error(`Network or Parsing error to Mercado Pago: ${err?.message}`);
      throw new Error(`Failed to call Mercado Pago API: ${err?.message}`);
    }
  }
}
