import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';

interface MercadoLivreOAuthStateData {
  tenantId: string;
  userId: string;
  expiresAt: number;
}

@Injectable()
export class MercadoLivreOAuthStateService {
  private readonly logger = new Logger(MercadoLivreOAuthStateService.name);
  private readonly redis: Redis;
  private readonly prefix = 'ml_oauth_state:';
  private readonly expirationSeconds = 10 * 60;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });
    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async generateState(tenantId: string, userId: string) {
    const state = randomBytes(32).toString('hex');
    const data: MercadoLivreOAuthStateData = {
      tenantId,
      userId,
      expiresAt: Date.now() + this.expirationSeconds * 1000,
    };

    await this.redis.set(
      `${this.prefix}${state}`,
      JSON.stringify(data),
      'EX',
      this.expirationSeconds,
    );

    return state;
  }

  async validateAndConsumeState(state: string) {
    const key = `${this.prefix}${state}`;
    const resultMulti = await this.redis.multi().get(key).del(key).exec();

    if (!resultMulti || !resultMulti[0] || resultMulti[0][0]) {
      return null;
    }

    const result = resultMulti[0][1] as string | null;
    if (!result) return null;

    try {
      const parsed = JSON.parse(result) as MercadoLivreOAuthStateData;
      if (Date.now() > parsed.expiresAt) return null;
      return { tenantId: parsed.tenantId, userId: parsed.userId };
    } catch (error) {
      this.logger.warn('Invalid Mercado Livre OAuth state payload.');
      return null;
    }
  }
}
