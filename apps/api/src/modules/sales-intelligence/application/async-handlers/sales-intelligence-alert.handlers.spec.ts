import {
  FinancialFactSalesAlertHandler,
  SettlementSalesAlertHandler,
} from './sales-intelligence-alert.handlers';

describe('SalesIntelligenceAlertHandler', () => {
  const prisma = {
    orderFinancialFact: {
      findUnique: jest.fn(),
    },
    reconciliationCase: {
      findFirst: jest.fn(),
    },
  };
  const alerts = {
    evaluateOrder: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fail the async event when alert evaluation fails', async () => {
    prisma.orderFinancialFact.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      orderId: 'order-1',
    });
    alerts.evaluateOrder.mockRejectedValue(new Error('detail not ready'));
    const handler = new FinancialFactSalesAlertHandler(prisma as never, alerts as never);

    await expect(
      handler.handle({
        messageId: 'message-1',
        eventType: 'financial.order_fact.created',
        eventVersion: 1,
        aggregateType: 'OrderFinancialFact',
        aggregateId: 'fact-1',
        occurredAt: '2026-08-05T21:30:00.000Z',
        payload: {},
      }),
    ).resolves.toBeUndefined();

    expect(alerts.evaluateOrder).toHaveBeenCalledWith('tenant-1', 'order-1');
  });

  it('resolves settlement events through reconciliation cases', async () => {
    prisma.reconciliationCase.findFirst.mockResolvedValue({
      tenantId: 'tenant-1',
      orderId: 'order-2',
    });
    alerts.evaluateOrder.mockResolvedValue(undefined);
    const handler = new SettlementSalesAlertHandler(prisma as never, alerts as never);

    await handler.handle({
      messageId: 'message-2',
      eventType: 'reconciliation.settlement_received',
      eventVersion: 1,
      aggregateType: 'ProviderSettlementEvent',
      aggregateId: 'settlement-1',
      occurredAt: '2026-08-05T21:35:00.000Z',
      payload: {},
    });

    expect(prisma.reconciliationCase.findFirst).toHaveBeenCalledWith({
      where: { settlementEventId: 'settlement-1', orderId: { not: null } },
      select: { tenantId: true, orderId: true },
    });
    expect(alerts.evaluateOrder).toHaveBeenCalledWith('tenant-1', 'order-2');
  });
});
