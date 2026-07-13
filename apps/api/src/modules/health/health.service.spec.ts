import {
  ExportJobStatus,
  ExportJobType,
  NotificationWebhookDeliveryStatus,
  ReconciliationCaseStatus,
} from '@prisma/client';
import { HealthService } from './health.service';

describe('HealthService settlement health', () => {
  it('returns sanitized aggregate settlement health without provider payloads', async () => {
    const prisma = {
      providerSettlementEvent: { count: jest.fn().mockResolvedValue(4) },
      reconciliationCase: { count: jest.fn().mockResolvedValue(2) },
      notificationWebhookDelivery: { count: jest.fn().mockResolvedValue(0) },
      exportJob: { count: jest.fn().mockResolvedValue(0) },
    };
    const service = new HealthService(prisma as never);

    const result = await service.getSettlementHealth();

    expect(prisma.providerSettlementEvent.count).toHaveBeenCalledWith({
      where: { createdAt: { gte: expect.any(Date) } },
    });
    expect(prisma.reconciliationCase.count).toHaveBeenCalledWith({
      where: {
        status: {
          in: [
            ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
            ReconciliationCaseStatus.CURRENCY_DIVERGENCE,
            ReconciliationCaseStatus.STATUS_DIVERGENCE,
          ],
        },
      },
    });
    expect(prisma.notificationWebhookDelivery.count).toHaveBeenCalledWith({
      where: { status: NotificationWebhookDeliveryStatus.DLQ },
    });
    expect(prisma.exportJob.count).toHaveBeenCalledWith({
      where: {
        type: {
          in: [ExportJobType.RECONCILIATION_CASES, ExportJobType.MARKETPLACE_SETTLEMENT_EVENTS],
        },
        status: ExportJobStatus.FAILED,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: 'attention',
        check: 'marketplace-settlement',
        settlementEventsLast24h: 4,
        openDivergenceCases: 2,
        webhookDeliveriesInDlq: 0,
        failedExports: 0,
        sanitized: true,
      }),
    );
    expect(JSON.stringify(result)).not.toContain('payload');
    expect(JSON.stringify(result)).not.toContain('token');
  });
});
