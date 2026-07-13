import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  WebhookProcessingStatus,
  Payment,
  PaymentStatus,
  PaymentProvider,
  Prisma,
  GatewayEnvironment,
} from '@prisma/client';
import { NormalizedWebhookEvent } from '../../domain/interfaces/provider-webhook-adapter.interface';
import { AsaasWebhookStatusMapper } from '../mappers/asaas-webhook-status.mapper';
import { MercadoPagoStatusMapper } from '../../../gateways/infra/providers/mercado-pago/mercado-pago-status.mapper';
import { MercadoPagoCredentialManager } from '../../../gateways/infra/providers/mercado-pago/mercado-pago-credential.manager';
import { MercadoPagoPaymentGatewayAdapter } from '../../../gateways/infra/providers/mercado-pago/mercado-pago-payment-gateway.adapter';
import { NotificationProducerService } from '../../../notifications/application/services/notification-producer.service';
import { AuditActions } from '../../../audit/domain/constants/audit-actions';

interface PaymentWebhookSyncResult {
  status: WebhookProcessingStatus;
  paymentId?: string;
  gatewayConfigurationId?: string;
  tenantId?: string;
  reason?: string;
  previousStatus?: PaymentStatus;
  currentStatus?: PaymentStatus;
}

@Injectable()
export class PaymentWebhookSyncService {
  private readonly logger = new Logger(PaymentWebhookSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoCredentialManager: MercadoPagoCredentialManager,
    private readonly mercadoPagoAdapter: MercadoPagoPaymentGatewayAdapter,
    private readonly notifications: NotificationProducerService,
  ) {}

  async syncAsaasPayment(event: NormalizedWebhookEvent): Promise<PaymentWebhookSyncResult> {
    if (!event.providerPaymentId && !event.paymentReference) {
      return {
        status: WebhookProcessingStatus.IGNORED,
        reason: 'No providerPaymentId or paymentReference in normalized event',
      };
    }

    const providerPaymentId = event.providerPaymentId;
    const externalReference = event.paymentReference;

    // Localize Payment
    let payment: Payment | null = null;

    if (providerPaymentId) {
      payment = await this.prisma.payment.findFirst({
        where: {
          provider: PaymentProvider.ASAAS,
          providerPaymentId,
        },
      });
    }

    if (!payment && externalReference) {
      payment = await this.prisma.payment.findFirst({
        where: {
          reference: externalReference,
        },
      });
    }

    if (!payment) {
      this.logger.warn(
        `[PaymentWebhookSyncService] Payment not found for Asaas Event ${event.providerEventId} (providerPaymentId: ${providerPaymentId}, ref: ${externalReference})`,
      );
      return {
        status: WebhookProcessingStatus.IGNORED,
        reason: 'Payment not found locally',
      };
    }

    const targetStatus = event.normalizedPaymentStatus as PaymentStatus | undefined;

    if (!targetStatus) {
      // Just update providerStatus
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerStatus: event.providerStatus,
          providerUpdatedAt: new Date(),
        },
      });
      return {
        status: WebhookProcessingStatus.IGNORED,
        reason: 'Event does not change status',
        paymentId: payment.id,
        gatewayConfigurationId: payment.gatewayConfigurationId || undefined,
        tenantId: payment.tenantId,
      };
    }

    // Check if terminal
    if (AsaasWebhookStatusMapper.isTerminalStatus(payment.status)) {
      this.logger.log(
        `[PaymentWebhookSyncService] Ignoring transition for ${payment.id} because status is already terminal (${payment.status})`,
      );
      return {
        status: WebhookProcessingStatus.PROCESSED,
        reason: 'Already terminal status',
        paymentId: payment.id,
        gatewayConfigurationId: payment.gatewayConfigurationId || undefined,
        tenantId: payment.tenantId,
      };
    }

    if (payment.status === targetStatus) {
      // Already up to date
      return {
        status: WebhookProcessingStatus.PROCESSED,
        reason: 'Status is already updated',
        paymentId: payment.id,
        gatewayConfigurationId: payment.gatewayConfigurationId || undefined,
        tenantId: payment.tenantId,
      };
    }

    const previousStatus = payment.status;

    // Prepare dates
    const dataToUpdate: Record<string, any> = {
      status: targetStatus,
      providerStatus: event.providerStatus,
      providerUpdatedAt: new Date(),
    };

    if (targetStatus === PaymentStatus.REFUNDED) dataToUpdate.refundedAt = new Date();
    if (targetStatus === PaymentStatus.CANCELED) dataToUpdate.canceledAt = new Date();

    const eventType = `payment.provider_${event.rawProviderEventType.toLowerCase()}`;

    // Transactional update
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: dataToUpdate,
      });

      await tx.paymentEvent.create({
        data: {
          tenantId: payment.tenantId,
          paymentId: payment.id,
          type: eventType,
          previousStatus: previousStatus,
          currentStatus: targetStatus,
          message: `Status atualizado via Webhook do Asaas (${event.rawProviderEventType})`,
          metadata: {
            providerEventId: event.providerEventId,
            providerPaymentId,
          },
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'payment.provider_status_updated',
        tenantId: payment.tenantId,
        actorUserId: 'system', // System action via webhook
        entityType: 'payment',
        entityId: payment.id,
        metadata: {
          provider: event.provider,
          providerEventId: event.providerEventId,
          providerPaymentId,
          paymentReference: payment.reference,
          previousStatus,
          currentStatus: targetStatus,
          providerStatus: event.providerStatus,
          gatewayConfigurationId: payment.gatewayConfigurationId,
        },
      },
    });

    this.logger.log(
      `[PaymentWebhookSyncService] Payment ${payment.id} updated to ${targetStatus} via Asaas Webhook`,
    );

    return {
      status: WebhookProcessingStatus.PROCESSED,
      paymentId: payment.id,
      gatewayConfigurationId: payment.gatewayConfigurationId || undefined,
      tenantId: payment.tenantId,
    };
  }

  async syncMercadoPagoPayment(event: NormalizedWebhookEvent): Promise<PaymentWebhookSyncResult> {
    if (!event.providerPaymentId && !event.paymentReference) {
      return {
        status: WebhookProcessingStatus.IGNORED,
        reason: 'No providerPaymentId or paymentReference in normalized Mercado Pago event',
      };
    }

    let payment = await this.findMercadoPagoPayment({
      providerPaymentId: event.providerPaymentId,
      paymentReference: event.paymentReference,
      tenantId: event.tenantId,
    });

    const tenantId = payment?.tenantId ?? event.tenantId;
    const gatewayConfigurationId =
      payment?.gatewayConfigurationId ?? event.gatewayConfigurationId ?? undefined;

    if (!event.providerPaymentId) {
      return this.statusOnlyResult(payment, 'No provider payment id for Mercado Pago fetch');
    }

    if (!tenantId || !gatewayConfigurationId) {
      this.logger.warn(
        `[PaymentWebhookSyncService] Mercado Pago event ${event.providerEventId} has no tenant/gateway mapping.`,
      );
      return {
        status: WebhookProcessingStatus.IGNORED,
        reason: 'Tenant or gateway configuration not resolved',
        paymentId: payment?.id,
        gatewayConfigurationId,
        tenantId,
      };
    }

    const credentials = await this.mercadoPagoCredentialManager.getValidCredentials({
      tenantId,
      gatewayConfigurationId,
      purpose: 'WEBHOOK_ENRICHMENT',
    });

    const providerPayment = await this.mercadoPagoAdapter.getPayment({
      tenantId,
      paymentId: payment?.id ?? event.paymentId ?? event.providerPaymentId,
      providerPaymentId: event.providerPaymentId,
      gatewayConfigurationId,
      credentials,
      environment: GatewayEnvironment.LIVE,
    });

    const externalReference = this.optionalString(providerPayment.metadata?.externalReference);
    if (!payment && externalReference) {
      payment = await this.findMercadoPagoPayment({
        providerPaymentId: providerPayment.providerPaymentId,
        paymentReference: externalReference,
        tenantId,
      });
    }

    if (!payment) {
      this.logger.warn(
        `[PaymentWebhookSyncService] Payment not found for Mercado Pago event ${event.providerEventId} (providerPaymentId: ${event.providerPaymentId}, ref: ${externalReference ?? event.paymentReference})`,
      );
      return {
        status: WebhookProcessingStatus.IGNORED,
        reason: 'Payment not found locally',
        gatewayConfigurationId,
        tenantId,
      };
    }

    const targetStatus = MercadoPagoStatusMapper.toLedgerFlowStatus(providerPayment.providerStatus);
    const providerStatus = providerPayment.providerStatus;
    const providerStatusDetail = this.optionalString(providerPayment.metadata?.statusDetail);

    if (!targetStatus) {
      await this.recordMercadoPagoUnmappedStatus({
        payment,
        event,
        providerStatus,
        providerStatusDetail,
        providerPaymentId: providerPayment.providerPaymentId,
      });

      return {
        status: WebhookProcessingStatus.PROCESSED,
        reason: 'Provider status does not map to a payment status transition',
        paymentId: payment.id,
        gatewayConfigurationId: payment.gatewayConfigurationId ?? gatewayConfigurationId,
        tenantId: payment.tenantId,
      };
    }

    if (!MercadoPagoStatusMapper.canTransition(payment.status, targetStatus)) {
      await this.updateProviderStatusOnly(payment, providerStatus);
      return {
        status: WebhookProcessingStatus.PROCESSED,
        reason:
          payment.status === targetStatus
            ? 'Status is already updated'
            : 'Terminal status transition blocked',
        paymentId: payment.id,
        gatewayConfigurationId: payment.gatewayConfigurationId ?? gatewayConfigurationId,
        tenantId: payment.tenantId,
        previousStatus: payment.status,
        currentStatus: payment.status,
      };
    }

    const previousStatus = payment.status;
    const now = new Date();
    const dataToUpdate: Prisma.PaymentUpdateInput = {
      status: targetStatus,
      providerStatus,
      providerUpdatedAt: now,
      providerPaymentId: providerPayment.providerPaymentId,
      providerInvoiceUrl: providerPayment.invoiceUrl,
      providerBankSlipUrl: providerPayment.bankSlipUrl,
      providerPixCopyPaste: providerPayment.pixCopyPaste,
      providerPixExpiresAt: providerPayment.expiresAt,
      providerPaymentUrl: providerPayment.checkoutUrl,
    };

    if (targetStatus === PaymentStatus.REFUNDED) dataToUpdate.refundedAt = now;
    if (targetStatus === PaymentStatus.CANCELED) dataToUpdate.canceledAt = now;

    const paymentEventType = this.mercadoPagoPaymentEventType(targetStatus);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: dataToUpdate,
      });

      await tx.paymentEvent.create({
        data: {
          tenantId: payment.tenantId,
          paymentId: payment.id,
          type: paymentEventType,
          previousStatus,
          currentStatus: targetStatus,
          message: `Status atualizado via webhook Mercado Pago (${providerStatus})`,
          metadata: {
            provider: PaymentProvider.MERCADO_PAGO,
            providerEventId: event.providerEventId,
            providerPaymentId: providerPayment.providerPaymentId,
            providerStatus,
            providerStatusDetail,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditActions.PAYMENT_PROVIDER_STATUS_UPDATED,
          tenantId: payment.tenantId,
          actorUserId: 'system',
          entityType: 'payment',
          entityId: payment.id,
          metadata: {
            provider: PaymentProvider.MERCADO_PAGO,
            providerEventId: event.providerEventId,
            providerPaymentId: providerPayment.providerPaymentId,
            paymentReference: payment.reference,
            previousStatus,
            currentStatus: targetStatus,
            providerStatus,
            providerStatusDetail,
            gatewayConfigurationId: payment.gatewayConfigurationId ?? gatewayConfigurationId,
          },
        },
      });
    });

    await this.notifications.mercadoPagoPaymentStatusUpdated({
      tenantId: payment.tenantId,
      paymentId: payment.id,
      paymentReference: payment.reference,
      previousStatus,
      currentStatus: targetStatus,
      providerPaymentId: providerPayment.providerPaymentId,
      providerEventId: event.providerEventId,
    });

    this.logger.log(
      `[PaymentWebhookSyncService] Payment ${payment.id} updated to ${targetStatus} via Mercado Pago webhook`,
    );

    return {
      status: WebhookProcessingStatus.PROCESSED,
      paymentId: payment.id,
      gatewayConfigurationId: payment.gatewayConfigurationId ?? gatewayConfigurationId,
      tenantId: payment.tenantId,
      previousStatus,
      currentStatus: targetStatus,
    };
  }

  private async findMercadoPagoPayment(input: {
    providerPaymentId?: string;
    paymentReference?: string;
    tenantId?: string;
  }): Promise<Payment | null> {
    if (input.providerPaymentId) {
      const payment = await this.prisma.payment.findFirst({
        where: {
          provider: PaymentProvider.MERCADO_PAGO,
          providerPaymentId: input.providerPaymentId,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        },
      });
      if (payment) return payment;
    }

    if (input.paymentReference) {
      return this.prisma.payment.findFirst({
        where: {
          provider: PaymentProvider.MERCADO_PAGO,
          reference: input.paymentReference,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        },
      });
    }

    return null;
  }

  private async updateProviderStatusOnly(payment: Payment, providerStatus?: string) {
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerStatus,
        providerUpdatedAt: new Date(),
      },
    });
  }

  private async recordMercadoPagoUnmappedStatus(input: {
    payment: Payment;
    event: NormalizedWebhookEvent;
    providerStatus: string;
    providerStatusDetail?: string;
    providerPaymentId: string;
  }) {
    const isChargeback = ['charged_back', 'chargeback'].includes(
      input.providerStatus.toLowerCase(),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: input.payment.id },
        data: {
          providerStatus: input.providerStatus,
          providerUpdatedAt: new Date(),
        },
      });

      if (isChargeback) {
        await tx.paymentEvent.create({
          data: {
            tenantId: input.payment.tenantId,
            paymentId: input.payment.id,
            type: 'payment.provider_chargeback_received',
            previousStatus: input.payment.status,
            currentStatus: input.payment.status,
            message: `Chargeback Mercado Pago recebido sem alterar status local (${input.providerStatus})`,
            metadata: {
              provider: PaymentProvider.MERCADO_PAGO,
              providerEventId: input.event.providerEventId,
              providerPaymentId: input.providerPaymentId,
              providerStatus: input.providerStatus,
              providerStatusDetail: input.providerStatusDetail,
            },
          },
        });
      }
    });
  }

  private statusOnlyResult(payment: Payment | null, reason: string): PaymentWebhookSyncResult {
    return {
      status: WebhookProcessingStatus.IGNORED,
      reason,
      paymentId: payment?.id,
      gatewayConfigurationId: payment?.gatewayConfigurationId ?? undefined,
      tenantId: payment?.tenantId,
    };
  }

  private mercadoPagoPaymentEventType(status: PaymentStatus) {
    switch (status) {
      case PaymentStatus.APPROVED:
        return AuditActions.PAYMENT_PROVIDER_PAYMENT_APPROVED;
      case PaymentStatus.FAILED:
        return AuditActions.PAYMENT_PROVIDER_PAYMENT_FAILED;
      case PaymentStatus.REFUNDED:
        return AuditActions.PAYMENT_PROVIDER_PAYMENT_REFUNDED;
      case PaymentStatus.CANCELED:
        return AuditActions.PAYMENT_PROVIDER_PAYMENT_CANCELED;
      default:
        return AuditActions.PAYMENT_PROVIDER_STATUS_UPDATED;
    }
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  }
}
