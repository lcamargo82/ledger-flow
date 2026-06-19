import { BadRequestException, NotFoundException, NotImplementedException } from '@nestjs/common';

export class GatewayNotConfiguredError extends NotFoundException {
  constructor(message = 'Gateway is not configured for this tenant.') {
    super(message);
    this.name = 'GatewayNotConfiguredError';
  }
}

export class GatewayNotSupportedError extends BadRequestException {
  constructor(provider: string) {
    super(`Gateway provider '${provider}' is not supported.`);
    this.name = 'GatewayNotSupportedError';
  }
}

export class GatewayOperationNotSupportedError extends BadRequestException {
  constructor(operation: string, provider: string) {
    super(`Operation '${operation}' is not supported by provider '${provider}'.`);
    this.name = 'GatewayOperationNotSupportedError';
  }
}

export class GatewayNotImplementedError extends NotImplementedException {
  constructor(provider: string) {
    super(`Gateway operation is not implemented for this provider yet (${provider}).`);
    this.name = 'GatewayNotImplementedError';
  }
}

export class GatewayCredentialsInvalidError extends BadRequestException {
  constructor(message = 'Gateway credentials are invalid.') {
    super(message);
    this.name = 'GatewayCredentialsInvalidError';
  }
}
