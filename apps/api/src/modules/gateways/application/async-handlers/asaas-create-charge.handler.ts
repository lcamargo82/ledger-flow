/* eslint-disable */

import { Injectable, Logger } from '@nestjs/common';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';
import { GatewayPaymentOrchestrationService } from '../services/gateway-payment-orchestration.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';

@Injectable()
export class AsaasCreateChargeAsyncHandler implements AsyncEventHandler {
  readonly eventType = 'payment.provider_charge_creation_requested';
  readonly consumerName = 'AsaasCreateChargeAsyncHandler';
  private readonly logger = new Logger(AsaasCreateChargeAsyncHandler.name);

  constructor(
    private readonly orchestrator: GatewayPaymentOrchestrationService,
    private readonly prisma: PrismaService,
  ) {}

  async handle(input: AsyncMessageEnvelope): Promise<void> {
    const paymentId = input.payload?.paymentId || input.aggregateId;
    this.logger.log(`Handling charge creation for payment ${paymentId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { customer: true },
    });

    if (!payment) {
      this.logger.error(`Payment ${paymentId} not found`);
      throw new Error(`Payment ${paymentId} not found`); // Let it fail
    }

    if (payment.providerPaymentId) {
      this.logger.log(`Payment ${paymentId} already processed (has provider ID)`);
      return; // Safe idempotency
    }

    const gatewayConfigurationId =
      payment.gatewayConfigurationId || input.payload?.gatewayConfigurationId;

    if (!gatewayConfigurationId) {
      throw new Error(`Payment ${paymentId} does not have a gateway configuration assigned`);
    }

    const config = await this.prisma.gatewayConfiguration.findUnique({
      where: { id: gatewayConfigurationId },
    });

    if (!config || config.provider !== 'ASAAS' || config.status !== 'ACTIVE') {
      throw new Error(`Gateway configuration ${gatewayConfigurationId} is invalid or inactive`);
    }

    const allowedEnv = process.env.PAYMENT_GATEWAY_ALLOWED_ENVIRONMENTS || 'SANDBOX';
    if (config.environment !== allowedEnv) {
      throw new Error(
        `Gateway configuration environment (${config.environment}) is not allowed by process (${allowedEnv})`,
      );
    }

    // Call orchestrator
    // We assume actorUserId is system since it's async
    await this.orchestrator.orchestrate(
      payment.tenantId,
      payment,
      payment.customer,
      'SYSTEM',
      gatewayConfigurationId,
    );
    this.logger.log(`Successfully orchestrated payment ${paymentId}`);
  }
}
