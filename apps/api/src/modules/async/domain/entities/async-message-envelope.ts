export interface AsyncMessageEnvelope {
  messageId: string;
  eventType: string;
  eventVersion: number;
  tenantId?: string;
  aggregateType: string;
  aggregateId: string;
  traceId?: string;
  occurredAt: string;
}
