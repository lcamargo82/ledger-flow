import { Injectable, Logger } from '@nestjs/common';
import { IGatewayApiClient } from '../../domain/interfaces/gateway-api-client.interface';
import { AsaasApiError } from '../../domain/errors/asaas-errors';

@Injectable()
export class AsaasApiClient implements IGatewayApiClient {
  private readonly logger = new Logger(AsaasApiClient.name);

  async post(endpoint: string, payload: any, headers?: Record<string, string>): Promise<any> {
    return this.request('POST', endpoint, payload, headers);
  }

  async get(
    endpoint: string,
    params?: Record<string, string>,
    headers?: Record<string, string>,
  ): Promise<any> {
    const urlParams = params ? new URLSearchParams(params).toString() : '';
    const fullEndpoint = urlParams ? `${endpoint}?${urlParams}` : endpoint;
    return this.request('GET', fullEndpoint, undefined, headers);
  }

  private async request(
    method: string,
    endpoint: string,
    payload?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    // Only sandbox is allowed per instructions
    const baseUrl = 'https://sandbox.asaas.com/api/v3';
    const url = `${baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'LedgerFlow/1.0.0',
      ...headers,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

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
        this.handleError(response.status, data);
      }

      return data;
    } catch (error: unknown) {
      if (error instanceof AsaasApiError) {
        throw error;
      }

      const err = error as Error;
      this.logger.error(`[AsaasApiClient] Failed to execute ${method} ${endpoint}: ${err.message}`);

      if (err.name === 'AbortError') {
        throw new AsaasApiError('A solicitação ao gateway excedeu o tempo esperado.', 408);
      }
      throw new AsaasApiError('O gateway apresentou uma instabilidade temporária.', 500);
    }
  }

  private handleError(status: number, data: any): void {
    let message = 'Erro desconhecido ao processar requisição no Asaas.';

    if (status === 401) {
      message = 'A configuração do gateway Asaas não está válida para este ambiente.';
    } else if (status === 400) {
      message =
        'Não foi possível criar a cobrança no Asaas. Verifique os dados do cliente e do pagamento.';
    } else if (status === 404) {
      message = 'O recurso solicitado não foi encontrado no Asaas.';
    } else if (status === 429) {
      message = 'O gateway está temporariamente indisponível. Tente novamente mais tarde.';
    } else if (status >= 500) {
      message = 'O gateway apresentou uma instabilidade temporária.';
    }

    const parsedData = data as { errors?: Array<{ description: string }> };
    if (parsedData?.errors && parsedData.errors.length > 0) {
      this.logger.error(
        `[AsaasApiClient] API Error: ${status} - ${parsedData.errors[0].description}`,
      );
    } else {
      this.logger.error(`[AsaasApiClient] API Error: ${status}`);
    }

    throw new AsaasApiError(message, status);
  }
}
