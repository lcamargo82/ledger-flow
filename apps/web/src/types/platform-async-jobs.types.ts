export interface AsyncJob {
  id: string;
  tenantId?: string;
  eventType: string;
  status: string;
  publishAttempts: number;
  createdAt: string;
  traceId?: string;
  lastErrorSummary?: string;
}

export interface ListAsyncJobsFilters {
  tenantId?: string;
  status?: string;
  eventType?: string;
  page?: number;
}
