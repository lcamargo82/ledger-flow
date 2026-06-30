/* eslint-disable */
import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { PrismaPaymentsRepository } from '../../infra/repositories/prisma-payments.repository';
import { PaymentReferenceService } from '../../infra/services/payment-reference.service';
import { canTransitionPaymentStatus } from '../../domain/payment-status-transition';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ListPaymentsQueryDto } from '../dto/list-payments-query.dto';
import { RefundPaymentDto } from '../dto/refund-payment.dto';
import { GatewayPaymentOrchestrationService } from '../../../gateways/application/services/gateway-payment-orchestration.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PrismaPaymentsRepository,
    private readonly referenceService: PaymentReferenceService,
    private readonly prisma: PrismaService, // Needed for audit log outside the repository if not separated
    private readonly gatewayOrchestrator: GatewayPaymentOrchestrationService,
  ) {}

  async createPayment(
    tenantId: string,
    actorUserId: string,
    idempotencyKey: string,
    data: CreatePaymentDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }

    // Generate secure hashes
    const idempotencyKeyHash = crypto.createHash('sha256').update(idempotencyKey).digest('hex');

    const payloadString = JSON.stringify(data);
    const idempotencyRequestHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    // Check idempotency
    const existingPayment = await this.paymentsRepository.findByIdempotencyKeyHash(
      tenantId,
      idempotencyKeyHash,
    );

    if (existingPayment) {
      if (existingPayment.idempotencyRequestHash === idempotencyRequestHash) {
        // Safe reuse, log internally
        console.log(`[Idempotency] Reused payment creation for key hash: ${idempotencyKeyHash}`);
        return existingPayment;
      } else {
        throw new ConflictException(
          'A payment with this idempotency key already exists with different data.',
        );
      }
    }

    // Validate Customer
    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer || customer.tenantId !== tenantId || !customer.active) {
      throw new NotFoundException('Customer not found or inactive.');
    }

    // Determine dueDate
    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;

    // Create Payment (starts as PENDING)
    const reference = this.referenceService.generateReference();
    
    // Prepare Outbox Event
    const eventPayload = {
      amount: data.amount,
      currency: data.currency || 'BRL',
      method: data.method,
      description: data.description,
      dueDate: dueDate?.toISOString(),
      metadata: data.metadata,
    };
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(eventPayload)).digest('hex');

    const outboxEventData = {
      tenantId,
      aggregateType: 'Payment',
      // aggregateId will be populated in repository
      eventType: 'payment.provider_charge_creation_requested',
      eventVersion: 1,
      payload: eventPayload,
      payloadHash,
    };

    const payment = await this.paymentsRepository.create({
      tenantId,
      customerId: data.customerId,
      reference,
      amount: data.amount,
      currency: data.currency || 'BRL',
      method: data.method,
      description: data.description,
      dueDate,
      metadata: data.metadata as any,
      idempotencyKeyHash,
      idempotencyRequestHash,
      events: {
        create: {
          tenantId,
          type: 'payment.created',
          currentStatus: PaymentStatus.PENDING,
          message: 'Payment created',
        },
      },
    }, outboxEventData);

    // Audit Log
    await this.auditLog(tenantId, actorUserId, 'payment.created', payment.id, {
      reference,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
    });

    return payment;
  }

  async listPayments(tenantId: string, query: ListPaymentsQueryDto) {
    return this.paymentsRepository.findPaginated({
      tenantId,
      ...query,
    });
  }

  async getPaymentDetails(id: string, tenantId: string) {
    const payment = await this.paymentsRepository.findByIdAndTenantWithEvents(id, tenantId);

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return payment;
  }

  async getPaymentInstructions(id: string, tenantId: string) {
    const payment = await this.paymentsRepository.findByIdAndTenant(id, tenantId);

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (!payment.providerPaymentId) {
      throw new BadRequestException('Payment does not have a provider payment id yet.');
    }

    const instructions = await this.gatewayOrchestrator.getPaymentInstructions(tenantId, payment);

    try {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerInvoiceUrl: instructions.invoiceUrl ?? undefined,
          providerBankSlipUrl: instructions.bankSlipUrl ?? undefined,
          providerPixCopyPaste: instructions.pixCopyPaste ?? undefined,
          providerPixExpiresAt: instructions.expiresAt ?? undefined,
          providerPaymentUrl: instructions.paymentUrl ?? undefined,
        },
      });
    } catch (err) {
      console.error(`Failed to update payment instructions metadata for payment ${payment.id}`, err);
    }

    return instructions;
  }

  async cancelPayment(id: string, tenantId: string, actorUserId: string) {
    const payment = await this.paymentsRepository.findByIdAndTenant(id, tenantId);

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (!canTransitionPaymentStatus(payment.status, PaymentStatus.CANCELED)) {
      throw new ConflictException('Payment cannot be canceled in its current status.');
    }

    try {
      await this.gatewayOrchestrator.cancelPayment(tenantId, payment);
    } catch (err: any) {
      if (err.message && err.message.includes('[AsaasAdapter] Conflict:')) {
        throw new ConflictException('O provedor recusou o cancelamento: A cobrança pode já estar paga, estornada ou inelegível. Aguarde a sincronização pelo webhook.');
      }
      throw new BadRequestException(`Falha ao cancelar pagamento no gateway: ${err.message}`);
    }

    const updatedPayment = await this.paymentsRepository.cancel(id, tenantId, {
      tenantId,
      type: 'payment.canceled',
      previousStatus: payment.status,
      currentStatus: PaymentStatus.CANCELED,
      message: 'Payment canceled manually',
    });

    await this.auditLog(tenantId, actorUserId, 'payment.canceled', payment.id, {
      reference: updatedPayment.reference,
      status: updatedPayment.status,
    });

    return updatedPayment;
  }

  async refundPayment(id: string, tenantId: string, actorUserId: string, data: RefundPaymentDto) {
    const payment = await this.paymentsRepository.findByIdAndTenant(id, tenantId);

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (!canTransitionPaymentStatus(payment.status, PaymentStatus.REFUNDED)) {
      throw new ConflictException('Payment cannot be refunded in its current status.');
    }

    // Log the request first
    await this.auditLog(tenantId, actorUserId, 'payment.refund_requested', payment.id, {
      reference: payment.reference,
      reason: data.reason,
    });

    const updatedPayment = await this.paymentsRepository.refund(id, tenantId, {
      tenantId,
      type: 'payment.refunded',
      previousStatus: payment.status,
      currentStatus: PaymentStatus.REFUNDED,
      message: data.reason || 'Payment refunded manually',
    });

    await this.auditLog(tenantId, actorUserId, 'payment.refunded', payment.id, {
      reference: updatedPayment.reference,
      status: updatedPayment.status,
    });

    return updatedPayment;
  }

  private async auditLog(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId,
          action,
          entityType: 'PAYMENT',
          entityId,
          metadata,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log', error);
    }
  }

}
