import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  PaymentStatus,
  PaymentProvider,
  WebhookProcessingStatus,
} from '@prisma/client';
import { AsaasWebhookEventDto } from '../dto/asaas-webhook-event.dto';
import { AsaasWebhookStatusMapper } from '../mappers/asaas-webhook-status.mapper';

@Injectable()
export class PaymentWebhookSyncService {
  private readonly logger = new Logger(PaymentWebhookSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncAsaasPayment(event: AsaasWebhookEventDto): Promise<{
    status: WebhookProcessingStatus;
    paymentId?: string;
    gatewayConfigurationId?: string;
    tenantId?: string;
    reason?: string;
  }> {
    if (!event.payment || !event.payment.id) {
      return {
        status: WebhookProcessingStatus.IGNORED,
        reason: 'No payment object in payload',
      };
    }

    const providerPaymentId = event.payment.id;
    const externalReference = event.payment.externalReference;

    // Localize Payment
    let payment = await this.prisma.payment.findFirst({
      where: {
        provider: PaymentProvider.ASAAS,
        providerPaymentId,
      },
    });

    if (!payment && externalReference) {
      payment = await this.prisma.payment.findFirst({
        where: {
          reference: externalReference,
        },
      });
    }

    if (!payment) {
      this.logger.warn(
        `[PaymentWebhookSyncService] Payment not found for Asaas Event ${event.id} (providerPaymentId: ${providerPaymentId}, ref: ${externalReference})`,
      );
      return {
        status: WebhookProcessingStatus.IGNORED,
        reason: 'Payment not found locally',
      };
    }

    const targetStatus = AsaasWebhookStatusMapper.toLedgerFlowStatus(
      event.event,
    );

    if (!targetStatus) {
      // Just update providerStatus
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerStatus: event.payment.status,
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
      providerStatus: event.payment.status,
      providerUpdatedAt: new Date(),
    };

    if (targetStatus === PaymentStatus.REFUNDED)
      dataToUpdate.refundedAt = new Date();
    if (targetStatus === PaymentStatus.CANCELED)
      dataToUpdate.canceledAt = new Date();

    const eventType = `payment.provider_${event.event.toLowerCase()}`;

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
          message: `Status atualizado via Webhook do Asaas (${event.event})`,
          metadata: { providerEventId: event.id, providerPaymentId },
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
          provider: 'ASAAS',
          providerEventId: event.id,
          providerPaymentId,
          paymentReference: payment.reference,
          previousStatus,
          currentStatus: targetStatus,
          providerStatus: event.payment.status,
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
}
