/* eslint-disable @typescript-eslint/require-await */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhookAuthenticationError } from '../../../domain/errors/webhook-errors';
import { ProviderWebhookAuthenticationInput } from '../../../domain/interfaces/provider-webhook-adapter.interface';
import { ProviderWebhookAuthenticator } from '../../../domain/interfaces/provider-webhook-authenticator.interface';

@Injectable()
export class AsaasWebhookAuthenticator implements ProviderWebhookAuthenticator {
  private readonly logger = new Logger(AsaasWebhookAuthenticator.name);

  constructor(private readonly configService: ConfigService) {}

  async authenticate(input: ProviderWebhookAuthenticationInput): Promise<void> {
    const expectedToken = this.configService.get<string>(
      'ASAAS_WEBHOOK_AUTH_TOKEN',
    );

    if (!expectedToken) {
      this.logger.error(
        '[AsaasWebhookAuthenticator] ASAAS_WEBHOOK_AUTH_TOKEN is not configured.',
      );
      throw new WebhookAuthenticationError();
    }

    const tokenHeader = input.headers['asaas-access-token'];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

    if (!token) {
      this.logger.warn(
        '[AsaasWebhookAuthenticator] Missing asaas-access-token header in webhook request.',
      );
      throw new WebhookAuthenticationError();
    }

    try {
      // Timing safe comparison to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedToken);
      const tokenBuffer = Buffer.from(token);

      if (
        expectedBuffer.length !== tokenBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, tokenBuffer)
      ) {
        this.logger.warn(
          '[AsaasWebhookAuthenticator] Invalid asaas-access-token in webhook request.',
        );
        throw new WebhookAuthenticationError();
      }
    } catch {
      this.logger.warn(
        '[AsaasWebhookAuthenticator] Error comparing tokens (likely length mismatch).',
      );
      throw new WebhookAuthenticationError();
    }

    this.logger.log(
      '[AsaasWebhookAuthenticator] Asaas webhook authenticated successfully.',
    );
  }
}
