import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

interface OAuthStateData {
  tenantId: string;
  userId: string;
  expiresAt: number;
}

@Injectable()
export class MercadoPagoOAuthStateService {
  private readonly logger = new Logger(MercadoPagoOAuthStateService.name);
  private readonly states = new Map<string, OAuthStateData>();
  private readonly expirationMinutes = 10;

  generateState(tenantId: string, userId: string): string {
    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.expirationMinutes * 60 * 1000;

    this.states.set(state, { tenantId, userId, expiresAt });

    // Auto-cleanup after expiration
    setTimeout(
      () => {
        this.states.delete(state);
      },
      this.expirationMinutes * 60 * 1000,
    );

    return state;
  }

  validateAndConsumeState(
    state: string,
  ): { tenantId: string; userId: string } | null {
    const data = this.states.get(state);

    if (!data) {
      this.logger.warn(`Invalid or expired OAuth state provided.`);
      return null;
    }

    // Always consume (one-time use)
    this.states.delete(state);

    if (Date.now() > data.expiresAt) {
      this.logger.warn(`OAuth state expired for tenant ${data.tenantId}.`);
      return null;
    }

    return { tenantId: data.tenantId, userId: data.userId };
  }
}
