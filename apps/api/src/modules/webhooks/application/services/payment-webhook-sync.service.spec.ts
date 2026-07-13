import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  WebhookProcessingStatus,
  WebhookProvider,
} from '@prisma/client';
import { PaymentWebhookSyncService } from './payment-webhook-sync.service';

describe('PaymentWebhookSyncService Mercado Pago', () => {
  const payment = {
    id: 'payment-1',
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    reference: 'LF-123',
    externalReference: null,
    amount: 12345,
    currency: 'BRL',
    method: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    executionMode: 'EXTERNAL_GATEWAY',
    description: null,
    dueDate: null,
    metadata: null,
    idempotencyKeyHash: 'idem-hash',
    idempotencyRequestHash: 'request-hash',
    provider: PaymentProvider.MERCADO_PAGO,
    providerPaymentId: '123',
    providerStatus: 'pending',
    providerUpdatedAt: null,
    providerInvoiceUrl: null,
    providerBankSlipUrl: null,
    providerPixCopyPaste: null,
    providerPixExpiresAt: null,
    providerPaymentUrl: null,
    gatewayConfigurationId: 'gateway-1',
    createdAt: new Date('2026-07-13T10:00:00.000Z'),
    updatedAt: new Date('2026-07-13T10:00:00.000Z'),
    canceledAt: null,
    refundedAt: null,
  };

  const prisma = {
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paymentEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const credentialManager = {
    getValidCredentials: jest.fn(),
  };
  const mercadoPagoAdapter = {
    getPayment: jest.fn(),
  };
  const notifications = {
    mercadoPagoPaymentStatusUpdated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        payment: prisma.payment,
        paymentEvent: prisma.paymentEvent,
        auditLog: prisma.auditLog,
      }),
    );
    credentialManager.getValidCredentials.mockResolvedValue({ accessToken: 'access-token' });
  });

  it('fetches Mercado Pago details and moves a local payment to approved', async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    mercadoPagoAdapter.getPayment.mockResolvedValue({
      provider: PaymentProvider.MERCADO_PAGO,
      providerPaymentId: '123',
      providerStatus: 'approved',
      normalizedStatus: PaymentStatus.APPROVED,
      metadata: {
        externalReference: 'LF-123',
        statusDetail: 'accredited',
      },
    });

    const service = makeService();
    const result = await service.syncMercadoPagoPayment({
      provider: WebhookProvider.MERCADO_PAGO,
      providerEventId: 'mp-event-1',
      eventType: 'payment',
      rawProviderEventType: 'payment',
      tenantId: 'tenant-1',
      gatewayConfigurationId: 'gateway-1',
      providerPaymentId: '123',
      providerStatus: 'payment.updated',
      payloadHash: 'hash-1',
      payloadSummary: {},
    });

    expect(credentialManager.getValidCredentials).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      gatewayConfigurationId: 'gateway-1',
      purpose: 'WEBHOOK_ENRICHMENT',
    });
    expect(mercadoPagoAdapter.getPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        providerPaymentId: '123',
        credentials: { accessToken: 'access-token' },
      }),
    );
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1' },
        data: expect.objectContaining({
          status: PaymentStatus.APPROVED,
          providerStatus: 'approved',
          providerPaymentId: '123',
        }),
      }),
    );
    expect(prisma.paymentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'payment.provider_payment_approved',
          previousStatus: PaymentStatus.PENDING,
          currentStatus: PaymentStatus.APPROVED,
        }),
      }),
    );
    expect(notifications.mercadoPagoPaymentStatusUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        paymentId: 'payment-1',
        previousStatus: PaymentStatus.PENDING,
        currentStatus: PaymentStatus.APPROVED,
      }),
    );
    expect(result).toMatchObject({
      status: WebhookProcessingStatus.PROCESSED,
      paymentId: 'payment-1',
      previousStatus: PaymentStatus.PENDING,
      currentStatus: PaymentStatus.APPROVED,
    });
  });

  it('does not regress an approved payment to pending', async () => {
    prisma.payment.findFirst.mockResolvedValue({ ...payment, status: PaymentStatus.APPROVED });
    mercadoPagoAdapter.getPayment.mockResolvedValue({
      provider: PaymentProvider.MERCADO_PAGO,
      providerPaymentId: '123',
      providerStatus: 'pending',
      normalizedStatus: PaymentStatus.PENDING,
      metadata: { externalReference: 'LF-123' },
    });

    const result = await makeService().syncMercadoPagoPayment({
      provider: WebhookProvider.MERCADO_PAGO,
      providerEventId: 'mp-event-2',
      eventType: 'payment',
      rawProviderEventType: 'payment',
      tenantId: 'tenant-1',
      gatewayConfigurationId: 'gateway-1',
      providerPaymentId: '123',
      payloadHash: 'hash-2',
      payloadSummary: {},
    });

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerStatus: 'pending',
        }),
      }),
    );
    expect(prisma.paymentEvent.create).not.toHaveBeenCalled();
    expect(notifications.mercadoPagoPaymentStatusUpdated).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: WebhookProcessingStatus.PROCESSED,
      reason: 'Terminal status transition blocked',
      currentStatus: PaymentStatus.APPROVED,
    });
  });

  it('records chargeback without changing the local payment status', async () => {
    prisma.payment.findFirst.mockResolvedValue({ ...payment, status: PaymentStatus.APPROVED });
    mercadoPagoAdapter.getPayment.mockResolvedValue({
      provider: PaymentProvider.MERCADO_PAGO,
      providerPaymentId: '123',
      providerStatus: 'charged_back',
      normalizedStatus: PaymentStatus.PENDING,
      metadata: { statusDetail: 'charged_back' },
    });

    const result = await makeService().syncMercadoPagoPayment({
      provider: WebhookProvider.MERCADO_PAGO,
      providerEventId: 'mp-event-3',
      eventType: 'payment',
      rawProviderEventType: 'payment',
      tenantId: 'tenant-1',
      gatewayConfigurationId: 'gateway-1',
      providerPaymentId: '123',
      payloadHash: 'hash-3',
      payloadSummary: {},
    });

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerStatus: 'charged_back',
        }),
      }),
    );
    expect(prisma.paymentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'payment.provider_chargeback_received',
          previousStatus: PaymentStatus.APPROVED,
          currentStatus: PaymentStatus.APPROVED,
        }),
      }),
    );
    expect(notifications.mercadoPagoPaymentStatusUpdated).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: WebhookProcessingStatus.PROCESSED,
      reason: 'Provider status does not map to a payment status transition',
    });
  });

  function makeService() {
    return new PaymentWebhookSyncService(
      prisma as never,
      credentialManager as never,
      mercadoPagoAdapter as never,
      notifications as never,
    );
  }
});
