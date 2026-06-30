/* eslint-disable */

import { Injectable, Logger } from '@nestjs/common';
import { Customer, Payment, PaymentStatus } from '@prisma/client';
import { PaymentGatewayResolverService } from './payment-gateway-resolver.service';
import { GatewayCustomerSyncService } from './gateway-customer-sync.service';
import { GatewayCredentialsEncryptionService } from './gateway-credentials-encryption.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';

@Injectable()
export class GatewayPaymentOrchestrationService {
  private readonly logger = new Logger(GatewayPaymentOrchestrationService.name);

  constructor(
    private readonly gatewayResolver: PaymentGatewayResolverService,
    private readonly customerSyncService: GatewayCustomerSyncService,
    private readonly credentialsEncryptionService: GatewayCredentialsEncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async orchestrate(
    tenantId: string,
    payment: Payment,
    customer: Customer,
    actorUserId: string,
    gatewayConfigurationId: string,
  ): Promise<Payment> {
    this.logger.log(
      `[GatewayOrchestration] Started for payment ${payment.id} (tenant: ${tenantId}, config: ${gatewayConfigurationId})`,
    );

    const configuration = await this.prisma.gatewayConfiguration.findUnique({
      where: { id: gatewayConfigurationId },
    });

    if (!configuration) {
      throw new Error(`Gateway configuration ${gatewayConfigurationId} not found`);
    }

    if (configuration.status !== 'ACTIVE') {
      throw new Error(`Gateway configuration ${gatewayConfigurationId} is not ACTIVE`);
    }

    const adapter = (this.gatewayResolver as any).factory.getAdapter(configuration.provider);

    this.logger.log(`[GatewayOrchestration] Syncing customer...`);
    const providerCustomerId = await this.customerSyncService.syncCustomer(customer, configuration);

    // Decrypt credentials
    if (!configuration.encryptedCredentials) {
      throw new Error('Gateway credentials are not configured');
    }

    const credentials = this.credentialsEncryptionService.decrypt(
      configuration.encryptedCredentials,
    );

    this.logger.log(`[GatewayOrchestration] Calling adapter to create payment...`);
    const result = await adapter.createPayment({
      tenantId,
      paymentId: payment.id,
      paymentReference: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        document: customer.document,
      },
      description: payment.description,
      dueDate: payment.dueDate,
      idempotencyKey: payment.idempotencyKeyHash,
      gatewayConfigurationId: configuration.id,
      environment: configuration.environment,
      providerCustomerId,
      credentials,
    });

    this.logger.log(`[GatewayOrchestration] payment_created: ${result.providerPaymentId}`);

    // Update payment
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: result.provider,
        providerPaymentId: result.providerPaymentId,
        providerStatus: result.providerStatus,
        providerUpdatedAt: new Date(),
        gatewayConfigurationId: configuration.id,
      },
    });

    // Audit and Events
    await this.createAuditAndEvent(
      tenantId,
      payment.id,
      'payment.provider_charge_created',
      PaymentStatus.PENDING,
      actorUserId,
      {
        provider: result.provider,
        providerPaymentId: result.providerPaymentId,
        providerStatus: result.providerStatus,
        gatewayConfigurationId: configuration.id,
      },
    );

    return updatedPayment;
  }

  async getPaymentInstructions(tenantId: string, payment: Payment) {
    if (!payment.gatewayConfigurationId || !payment.providerPaymentId) {
      throw new Error('Payment is not linked to a gateway yet.');
    }

    const configuration = await this.prisma.gatewayConfiguration.findUnique({
      where: { id: payment.gatewayConfigurationId },
    });

    if (!configuration || !configuration.encryptedCredentials) {
      throw new Error('Gateway configuration not found or missing credentials.');
    }

    const adapter = (this.gatewayResolver as any).factory.getAdapter(configuration.provider);

    const credentials = this.credentialsEncryptionService.decrypt(
      configuration.encryptedCredentials,
    );

    const instructions = await adapter.getPaymentInstructions({
      tenantId,
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId,
      method: payment.method,
      credentials,
      environment: configuration.environment,
    });

    return instructions;
  }

  async cancelPayment(tenantId: string, payment: Payment) {
    if (!payment.gatewayConfigurationId || !payment.providerPaymentId) {
      return true;
    }

    const configuration = await this.prisma.gatewayConfiguration.findUnique({
      where: { id: payment.gatewayConfigurationId },
    });

    if (!configuration || !configuration.encryptedCredentials) {
      throw new Error('Gateway configuration not found or missing credentials.');
    }

    const adapter = (this.gatewayResolver as any).factory.getAdapter(configuration.provider);

    const credentials = this.credentialsEncryptionService.decrypt(
      configuration.encryptedCredentials,
    );

    await adapter.cancelPayment({
      tenantId,
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId,
      gatewayConfigurationId: configuration.id,
      credentials,
      environment: configuration.environment,
    });

    return true;
  }

  private async createAuditAndEvent(
    tenantId: string,
    paymentId: string,
    action: string,
    currentStatus: PaymentStatus,
    actorUserId: string,
    metadata: Record<string, unknown>,
  ) {
    try {
      await this.prisma.$transaction([
        this.prisma.paymentEvent.create({
          data: {
            tenantId,
            paymentId,
            type: action,
            currentStatus,
            metadata: metadata as import('@prisma/client').Prisma.InputJsonValue,
          },
        }),
        this.prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId,
            action,
            entityType: 'PAYMENT',
            entityId: paymentId,
            metadata: metadata as import('@prisma/client').Prisma.InputJsonValue,
          },
        }),
      ]);
    } catch (err) {
      this.logger.error(`[GatewayOrchestration] Failed to save audit logs: ${err}`);
    }
  }
}
