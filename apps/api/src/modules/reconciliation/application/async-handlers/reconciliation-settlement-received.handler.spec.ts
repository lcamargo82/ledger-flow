import { ReconciliationSettlementReceivedAsyncHandler } from './reconciliation-settlement-received.handler';

describe('ReconciliationSettlementReceivedAsyncHandler', () => {
  it('runs matching for settlement received events', async () => {
    const matchingService = {
      matchSettlement: jest.fn().mockResolvedValue({ created: true }),
    };
    const handler = new ReconciliationSettlementReceivedAsyncHandler(
      matchingService as never,
    );

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
    expect(matchingService.matchSettlement).toHaveBeenCalledWith('settlement-1');
  });
});
