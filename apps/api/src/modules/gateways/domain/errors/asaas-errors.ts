import { GatewayError } from './gateway-errors';

export class AsaasApiError extends GatewayError {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message, 'ASAAS');
    this.name = 'AsaasApiError';
  }
}

export class AsaasCustomerSyncError extends GatewayError {
  constructor(message: string) {
    super(message, 'ASAAS');
    this.name = 'AsaasCustomerSyncError';
  }
}

export class AsaasPaymentCreateError extends GatewayError {
  constructor(message: string) {
    super(message, 'ASAAS');
    this.name = 'AsaasPaymentCreateError';
  }
}
