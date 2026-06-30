import { Injectable, Logger } from '@nestjs/common';
import { ExternalProviderExecutionPolicy } from '../../domain/interfaces/external-provider-execution-policy.interface';

@Injectable()
export class RedisExternalProviderRateLimitService implements ExternalProviderExecutionPolicy {
  private readonly logger = new Logger(RedisExternalProviderRateLimitService.name);
  private readonly defaultConcurrency = Number(process.env.EXTERNAL_PROVIDER_DEFAULT_CONCURRENCY) || 3;
  private readonly minIntervalMs = Number(process.env.EXTERNAL_PROVIDER_DEFAULT_MIN_INTERVAL_MS) || 500;
  private readonly locks: Map<string, number> = new Map();

  async acquire(input: { provider: string; tenantId: string; operation: string; traceId?: string }): Promise<void> {
    const key = `external-provider:${input.provider}:${input.tenantId}:${input.operation}`;
    
    const count = (this.locks.get(key) || 0) + 1;
    this.locks.set(key, count);

    if (count > this.defaultConcurrency) {
      this.logger.debug(`Rate limit acquired delay for ${key}, count ${count}`);
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs));
    }
  }

  async release(input: { provider: string; tenantId: string; operation: string; traceId?: string }): Promise<void> {
    const key = `external-provider:${input.provider}:${input.tenantId}:${input.operation}`;
    const count = (this.locks.get(key) || 0) - 1;
    if (count <= 0) {
      this.locks.delete(key);
    } else {
      this.locks.set(key, count);
    }
  }
}
