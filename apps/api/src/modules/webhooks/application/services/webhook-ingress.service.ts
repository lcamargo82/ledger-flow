import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhookAuthenticationError } from '../../domain/errors/webhook-errors';

@Injectable()
export class WebhookIngressService {
  private readonly logger = new Logger(WebhookIngressService.name);

  constructor(private readonly configService: ConfigService) {}

  authenticateAsaas(token: string | undefined): void {
    const expectedToken = this.configService.get<string>(
      'ASAAS_WEBHOOK_AUTH_TOKEN',
    );

    if (!expectedToken) {
      this.logger.error(
        '[WebhookIngressService] ASAAS_WEBHOOK_AUTH_TOKEN is not configured.',
      );
      throw new WebhookAuthenticationError();
    }

    if (!token) {
      this.logger.warn(
        '[WebhookIngressService] Missing asaas-access-token header in webhook request.',
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
          '[WebhookIngressService] Invalid asaas-access-token in webhook request.',
        );
        throw new WebhookAuthenticationError();
      }
    } catch {
      this.logger.warn(
        '[WebhookIngressService] Error comparing tokens (likely length mismatch).',
      );
      throw new WebhookAuthenticationError();
    }

    this.logger.log(
      '[WebhookIngressService] Asaas webhook authenticated successfully.',
    );
  }
}
