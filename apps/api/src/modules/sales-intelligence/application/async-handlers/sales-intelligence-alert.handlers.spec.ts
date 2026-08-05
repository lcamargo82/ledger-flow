import { FinancialFactSalesAlertHandler } from './sales-intelligence-alert.handlers';

describe('SalesIntelligenceAlertHandler', () => {
  const prisma = {
    orderFinancialFact: {
      findUnique: jest.fn(),
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
});
