import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface OAuthStateData {
  tenantId: string;
  userId: string;
  expiresAt: number;
}

@Injectable()
export class MercadoPagoOAuthStateService {
  private readonly logger = new Logger(MercadoPagoOAuthStateService.name);
  private readonly redis: Redis;
  private readonly prefix = 'mp_oauth_state:';
  private readonly expirationMinutes = 10;

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });
    this.redis.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err}`);
    });
  }

  async generateState(tenantId: string, userId: string): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.expirationMinutes * 60 * 1000;

    const data: OAuthStateData = { tenantId, userId, expiresAt };
    const key = `${this.prefix}${state}`;

    await this.redis.set(
      key,
      JSON.stringify(data),
      'EX',
      this.expirationMinutes * 60,
    );

    return state;
  }

  async validateAndConsumeState(
    state: string,
  ): Promise<{ tenantId: string; userId: string } | null> {
    const key = `${this.prefix}${state}`;

    // Atomic GET and DEL to prevent reuse
    const resultMulti = await this.redis.multi().get(key).del(key).exec();

    if (!resultMulti || !resultMulti[0] || resultMulti[0][0]) {
      this.logger.warn(
        `Invalid, expired or already consumed OAuth state provided.`,
      );
      return null;
    }

    const result = resultMulti[0][1] as string | null;

    if (!result) {
      this.logger.warn(`Invalid or expired OAuth state provided.`);
      return null;
    }

    try {
      const data = JSON.parse(result) as OAuthStateData;
      if (Date.now() > data.expiresAt) {
        this.logger.warn(
          `OAuth state expired logically for tenant ${data.tenantId}.`,
        );
        return null;
      }
      return { tenantId: data.tenantId, userId: data.userId };
    } catch (e: unknown) {
      this.logger.error(
        `Failed to parse OAuth state data: ${(e as Error).message}`,
      );
      return null;
    }
  }
}
