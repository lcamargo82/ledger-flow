import { Injectable, Logger } from '@nestjs/common';
import { ExternalProviderExecutionPolicy } from '../../domain/interfaces/external-provider-execution-policy.interface';
import { RedisService } from '../../../database/redis/redis.service';

@Injectable()
export class RedisExternalProviderRateLimitService implements ExternalProviderExecutionPolicy {
  private readonly logger = new Logger(RedisExternalProviderRateLimitService.name);
  private readonly defaultConcurrency = Number(process.env.EXTERNAL_PROVIDER_DEFAULT_CONCURRENCY) || 3;
  private readonly minIntervalMs = Number(process.env.EXTERNAL_PROVIDER_DEFAULT_MIN_INTERVAL_MS) || 500;

  constructor(private readonly redisService: RedisService) {}

  async acquire(input: { provider: string; tenantId: string; operation: string; traceId?: string }): Promise<void> {
    const key = \`external-provider:\${input.provider}:\${input.tenantId}:\${input.operation}\`;
    const client = this.redisService.getClient();
    
    // Simple semaphore using Redis sorted sets or simple counters.
    // In this basic implementation, we just use a counter to limit concurrency.
    // For a real prod system, use a robust Redis rate limiter like 'rate-limiter-flexible'.
    const count = await client.incr(key);
    
    if (count === 1) {
      await client.expire(key, 60); // Auto-expire after 60s to prevent deadlocks
    }

    if (count > this.defaultConcurrency) {
      // If we exceed concurrency, wait a bit and retry (simple backoff)
      // Note: for worker processes, throwing a RetryableError might be better
      // to let RabbitMQ handle the backoff, but here we do a small delay.
      this.logger.debug(\`Rate limit acquired delay for \${key}, count \${count}\`);
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs));
      // Try again or just proceed slowly
    }
  }

  async release(input: { provider: string; tenantId: string; operation: string; traceId?: string }): Promise<void> {
    const key = \`external-provider:\${input.provider}:\${input.tenantId}:\${input.operation}\`;
    const client = this.redisService.getClient();
    const count = await client.decr(key);
    if (count < 0) {
      await client.set(key, 0);
    }
  }
}
