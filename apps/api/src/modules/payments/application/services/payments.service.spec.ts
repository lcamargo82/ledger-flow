import { ConflictException } from '@nestjs/common';
import {
  PaymentExecutionMode,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService provider operations', () => {
  const payment = {
    id: 'payment-1',
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    reference: 'LF-123',
    amount: 10000,
    currency: 'BRL',
    method: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    executionMode: PaymentExecutionMode.EXTERNAL_GATEWAY,
    provider: PaymentProvider.MERCADO_PAGO,
    providerPaymentId: 'mp-123',
    gatewayConfigurationId: 'gateway-1',
  };

  const paymentsRepository = {
    findByIdAndTenant: jest.fn(),
    cancel: jest.fn(),
    refund: jest.fn(),
  };
  const referenceService = {};
  const prisma = {
    auditLog: {
      create: jest.fn(),
    },
  };
  const gatewayOrchestrator = {
    cancelPayment: jest.fn(),
    refundPayment: jest.fn(),
  };
  const gatewayResolver = {};
  const externalProcessingService = {};
  const notifications = {
    mercadoPagoPaymentStatusUpdated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('cancels a pending Mercado Pago payment through the gateway before local mutation', async () => {
    paymentsRepository.findByIdAndTenant.mockResolvedValue(payment);
    gatewayOrchestrator.cancelPayment.mockResolvedValue({
      providerStatus: 'cancelled',
    });
    paymentsRepository.cancel.mockResolvedValue({
      ...payment,
      status: PaymentStatus.CANCELED,
    });

    const result = await makeService().cancelPayment('payment-1', 'tenant-1', 'user-1');

    expect(gatewayOrchestrator.cancelPayment).toHaveBeenCalledWith('tenant-1', payment);
    expect(paymentsRepository.cancel).toHaveBeenCalledWith(
      'payment-1',
      'tenant-1',
      expect.objectContaining({
        previousStatus: PaymentStatus.PENDING,
        currentStatus: PaymentStatus.CANCELED,
        metadata: expect.objectContaining({
          provider: PaymentProvider.MERCADO_PAGO,
          providerPaymentId: 'mp-123',
          providerStatus: 'cancelled',
        }),
      }),
    );
    expect(notifications.mercadoPagoPaymentStatusUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
        currentStatus: PaymentStatus.CANCELED,
      }),
    );
    expect(result.status).toBe(PaymentStatus.CANCELED);
  });

  it('does not call the gateway again when cancel is already completed locally', async () => {
    paymentsRepository.findByIdAndTenant.mockResolvedValue({
      ...payment,
      status: PaymentStatus.CANCELED,
    });

    const result = await makeService().cancelPayment('payment-1', 'tenant-1', 'user-1');

    expect(gatewayOrchestrator.cancelPayment).not.toHaveBeenCalled();
    expect(paymentsRepository.cancel).not.toHaveBeenCalled();
    expect(result.status).toBe(PaymentStatus.CANCELED);
  });

  it('refunds an approved Mercado Pago payment through the gateway before local mutation', async () => {
    const approved = { ...payment, status: PaymentStatus.APPROVED };
    paymentsRepository.findByIdAndTenant.mockResolvedValue(approved);
    gatewayOrchestrator.refundPayment.mockResolvedValue({
      providerStatus: 'approved',
      metadata: { refundId: 'refund-1' },
    });
    paymentsRepository.refund.mockResolvedValue({
      ...approved,
      status: PaymentStatus.REFUNDED,
    });

    const result = await makeService().refundPayment('payment-1', 'tenant-1', 'user-1', {
      reason: 'Customer requested refund',
    });

    expect(gatewayOrchestrator.refundPayment).toHaveBeenCalledWith('tenant-1', approved, {
      reason: 'Customer requested refund',
    });
    expect(paymentsRepository.refund).toHaveBeenCalledWith(
      'payment-1',
      'tenant-1',
      expect.objectContaining({
        previousStatus: PaymentStatus.APPROVED,
        currentStatus: PaymentStatus.REFUNDED,
        metadata: expect.objectContaining({
          providerRefundId: 'refund-1',
          providerStatus: 'approved',
        }),
      }),
    );
    expect(notifications.mercadoPagoPaymentStatusUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
        currentStatus: PaymentStatus.REFUNDED,
      }),
    );
    expect(result.status).toBe(PaymentStatus.REFUNDED);
  });

  it('maps provider refusal during refund to a conflict', async () => {
    const approved = { ...payment, status: PaymentStatus.APPROVED };
    paymentsRepository.findByIdAndTenant.mockResolvedValue(approved);
    gatewayOrchestrator.refundPayment.mockRejectedValue({ statusCode: 409, message: 'conflict' });

    await expect(
      makeService().refundPayment('payment-1', 'tenant-1', 'user-1', {
        reason: 'Customer requested refund',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(paymentsRepository.refund).not.toHaveBeenCalled();
  });

  function makeService() {
    return new PaymentsService(
      paymentsRepository as never,
      referenceService as never,
      prisma as never,
      gatewayOrchestrator as never,
      gatewayResolver as never,
      externalProcessingService as never,
      notifications as never,
    );
  }
});
