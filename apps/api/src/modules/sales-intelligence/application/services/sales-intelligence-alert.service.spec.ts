import { SalesIntelligenceAlertService } from './sales-intelligence-alert.service';

describe('SalesIntelligenceAlertService', () => {
  const sales = { getDetail: jest.fn() };
  const policies = { getPolicy: jest.fn() };
  const notifications = { createEvent: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    policies.getPolicy.mockResolvedValue({ lowMarginEnabled: true, lowMarginThreshold: '10.00' });
    notifications.createEvent.mockResolvedValue({ created: true });
  });

  it('prioritizes loss over low margin', async () => {
    sales.getDetail.mockResolvedValue(detail({ profitabilityStatus: 'LOSS', marginPercent: '-5' }));
    const service = new SalesIntelligenceAlertService(
      sales as never,
      policies as never,
      notifications as never,
    );

    await service.evaluateOrder('tenant-1', 'order-1');

    expect(notifications.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'sale.loss_detected' }),
    );
    expect(notifications.createEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'sale.low_margin_detected' }),
    );
  });

  it('emits missing cost instead of low margin', async () => {
    sales.getDetail.mockResolvedValue(
      detail({ profitabilityStatus: 'MISSING_COST', marginPercent: null }),
    );
    const service = new SalesIntelligenceAlertService(
      sales as never,
      policies as never,
      notifications as never,
    );

    await service.evaluateOrder('tenant-1', 'order-1');

    expect(notifications.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'sale.missing_cost_detected' }),
    );
    expect(notifications.createEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'sale.low_margin_detected' }),
    );
  });

  it('uses the configured threshold and marks an estimated margin alert', async () => {
    policies.getPolicy.mockResolvedValue({ lowMarginEnabled: true, lowMarginThreshold: '12.50' });
    sales.getDetail.mockResolvedValue(
      detail({ profitabilityStatus: 'PROFIT', marginPercent: '11.00', profitSource: 'ESTIMATED' }),
    );
    const service = new SalesIntelligenceAlertService(
      sales as never,
      policies as never,
      notifications as never,
    );

    await service.evaluateOrder('tenant-1', 'order-1');

    expect(notifications.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'sale.low_margin_detected',
        idempotencyKey: expect.stringContaining('12.50'),
        translationArgs: expect.objectContaining({ estimated: true, threshold: '12.50' }),
      }),
    );
  });

  it('does not emit low margin when the tenant disabled it', async () => {
    policies.getPolicy.mockResolvedValue({ lowMarginEnabled: false, lowMarginThreshold: '10.00' });
    sales.getDetail.mockResolvedValue(
      detail({ profitabilityStatus: 'PROFIT', marginPercent: '2.00' }),
    );
    const service = new SalesIntelligenceAlertService(
      sales as never,
      policies as never,
      notifications as never,
    );

    await service.evaluateOrder('tenant-1', 'order-1');

    expect(notifications.createEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'sale.low_margin_detected' }),
    );
  });

  it('emits independent stock, shipping, settlement and blocked cash alerts', async () => {
    sales.getDetail.mockResolvedValue(
      detail({
        stockStatus: 'RESERVED',
        shippingStatus: 'DELAYED',
        settlementStatus: 'DIVERGENT',
        cashStatus: 'BLOCKED',
      }),
    );
    const service = new SalesIntelligenceAlertService(
      sales as never,
      policies as never,
      notifications as never,
    );

    await service.evaluateOrder('tenant-1', 'order-1');

    expect(notifications.createEvent.mock.calls.map(([input]) => input.eventType)).toEqual(
      expect.arrayContaining([
        'sale.stock_not_consumed',
        'sale.shipping_delayed',
        'sale.settlement_divergent',
        'sale.cash_release_blocked',
      ]),
    );
  });
});

function detail(
  overrides: {
    profitabilityStatus?: string;
    marginPercent?: string | null;
    profitSource?: string;
    stockStatus?: string;
    shippingStatus?: string;
    settlementStatus?: string;
    cashStatus?: string;
  } = {},
) {
  return {
    orderId: 'order-1',
    orderNumber: 'ML-123',
    orderStatus: 'FULFILLED',
    stockStatus: overrides.stockStatus ?? 'CONSUMED',
    financial: {
      profitabilityStatus: overrides.profitabilityStatus ?? 'PROFIT',
      marginPercent: overrides.marginPercent ?? '25.00',
      profitSource: overrides.profitSource ?? 'REALIZED',
    },
    shipping: { status: overrides.shippingStatus ?? 'DELIVERED' },
    settlement: {
      status: overrides.settlementStatus ?? 'RECONCILED',
      cashStatus: overrides.cashStatus ?? 'REALIZED',
    },
  };
}
