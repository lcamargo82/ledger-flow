export class WebhookAuthenticationError extends Error {
  constructor(message = 'Não autorizado.') {
    super(message);
    this.name = 'WebhookAuthenticationError';
  }
}

export class WebhookPayloadInvalidError extends Error {
  constructor(message = 'Payload de webhook inválido.') {
    super(message);
    this.name = 'WebhookPayloadInvalidError';
  }
}

export class WebhookProcessingError extends Error {
  constructor(message = 'Erro ao processar o webhook.') {
    super(message);
    this.name = 'WebhookProcessingError';
  }
}
