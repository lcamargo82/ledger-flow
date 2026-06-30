export interface ExternalProviderExecutionPolicy {
  acquire(input: {
    provider: string;
    tenantId: string;
    operation: string;
    traceId?: string;
  }): Promise<void>;

  release(input: {
    provider: string;
    tenantId: string;
    operation: string;
    traceId?: string;
  }): Promise<void>;
}
