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
    this.logger.log(`Handling charge creation for payment ${input.aggregateId}`);
    const payment = await this.prisma.payment.findUnique({
      where: { id: input.aggregateId },
      include: { customer: true }
    });

    if (!payment) {
      this.logger.error(`Payment ${input.aggregateId} not found`);
      return;
    }

    if (payment.providerPaymentId) {
       this.logger.log(`Payment ${input.aggregateId} already processed (has provider ID)`);
       return;
    }

    // Call orchestrator
    // We assume actorUserId is system since it's async
    await this.orchestrator.orchestrate(payment.tenantId, payment, payment.customer as any, 'SYSTEM');
    this.logger.log(`Successfully orchestrated payment ${input.aggregateId}`);
  }
}
