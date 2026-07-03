import { ReconciliationSettlementReceivedAsyncHandler } from './reconciliation-settlement-received.handler';

describe('ReconciliationSettlementReceivedAsyncHandler', () => {
  it('accepts settlement received events without running matching yet', async () => {
    const handler = new ReconciliationSettlementReceivedAsyncHandler();

    await expect(
      handler.handle({
        messageId: 'outbox-1',
        eventType: 'reconciliation.settlement_received',
        eventVersion: 1,
        tenantId: 'tenant-1',
        aggregateType: 'ProviderSettlementEvent',
        aggregateId: 'settlement-1',
        occurredAt: '2026-07-03T10:00:00.000Z',
        payload: {
          providerSettlementEventId: 'settlement-1',
        },
      }),
    ).resolves.toBeUndefined();
    expect(handler.eventType).toBe('reconciliation.settlement_received');
    expect(handler.consumerName).toBe('ReconciliationSettlementReceivedAsyncHandler');
  });
});
