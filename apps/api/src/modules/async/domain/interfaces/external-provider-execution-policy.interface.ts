export abstract class ExternalProviderExecutionPolicy {
  abstract acquire(input: {
    provider: string;
    tenantId: string;
    operation: string;
    traceId?: string;
  }): Promise<void>;

  abstract release(input: {
    provider: string;
    tenantId: string;
    operation: string;
    traceId?: string;
  }): Promise<void>;
}
