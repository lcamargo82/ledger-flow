import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhookAuthenticationError } from '../../../domain/errors/webhook-errors';
import { ProviderWebhookAuthenticationInput } from '../../../domain/interfaces/provider-webhook-adapter.interface';

@Injectable()
export class MercadoPagoWebhookAuthenticator {
  private readonly logger = new Logger(MercadoPagoWebhookAuthenticator.name);

  constructor(private readonly config: ConfigService) {}

  async authenticate(input: ProviderWebhookAuthenticationInput): Promise<void> {
    const secret = this.config.get<string>('MERCADO_PAGO_WEBHOOK_SECRET');
    const isProduction =
      this.config.get<string>('NODE_ENV') === 'production' ||
      this.config.get<string>('APP_ENV') === 'production';

    if (!secret) {
      if (isProduction) {
        this.logger.error('Mercado Pago webhook secret is not configured in production.');
        throw new WebhookAuthenticationError();
      }
      this.logger.warn('Mercado Pago webhook secret not configured; accepting in non-production.');
      return;
    }

    const signature = this.firstHeader(input.headers['x-signature']);
    const requestId = this.firstHeader(input.headers['x-request-id']);
    const dataId = this.extractDataId(input.payload);

    if (!signature || !requestId || !dataId) {
      this.logger.warn('Mercado Pago webhook signature headers or data.id are missing.');
      throw new WebhookAuthenticationError();
    }

    const parts = this.parseSignature(signature);
    const timestamp = parts.get('ts');
    const providerSignature = parts.get('v1');

    if (!timestamp || !providerSignature) {
      this.logger.warn('Mercado Pago webhook signature is malformed.');
      throw new WebhookAuthenticationError();
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    if (!this.safeEquals(expected, providerSignature)) {
      this.logger.warn('Mercado Pago webhook signature validation failed.');
      throw new WebhookAuthenticationError();
    }
  }

  private extractDataId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const data = (payload as Record<string, unknown>).data;
    if (!data || typeof data !== 'object') return null;
    const id = (data as Record<string, unknown>).id;
    return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
  }

  private firstHeader(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private parseSignature(signature: string): Map<string, string> {
    return new Map(
      signature.split(',').map((part) => {
        const [key, value] = part.trim().split('=');
        return [key, value] as [string, string];
      }),
    );
  }

  private safeEquals(expected: string, received: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    return (
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }
}
