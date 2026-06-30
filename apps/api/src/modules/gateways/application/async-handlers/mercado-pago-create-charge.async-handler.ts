import { Injectable, Logger } from '@nestjs/common';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';
import { GatewayPaymentOrchestrationService } from '../services/gateway-payment-orchestration.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { PaymentProvider } from '@prisma/client';

@Injectable()
export class MercadoPagoCreateChargeAsyncHandler implements AsyncEventHandler {
  readonly eventType = 'payment.provider_charge_creation_requested';
  readonly consumerName = 'MercadoPagoCreateChargeAsyncHandler';
  private readonly logger = new Logger(MercadoPagoCreateChargeAsyncHandler.name);

  constructor(
    private readonly orchestrator: GatewayPaymentOrchestrationService,
    private readonly prisma: PrismaService,
  ) {}

  async handle(input: AsyncMessageEnvelope): Promise<void> {
    this.logger.log(`Handling Mercado Pago charge creation for payment ${input.aggregateId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: input.aggregateId },
      include: { customer: true },
    });

    if (!payment) {
      this.logger.error(`Payment ${input.aggregateId} not found`);
      return;
    }

    if (payment.providerPaymentId) {
      this.logger.log(`Payment ${input.aggregateId} already processed (has provider ID)`);
      return;
    }

    // Check if the current active configuration for this tenant is Mercado Pago
    // If it's not, we just return and let the other handler process it (or it's an error)
    const activeConfig = await this.prisma.gatewayConfiguration.findFirst({
      where: {
        tenantId: payment.tenantId,
        status: 'ACTIVE',
      },
      orderBy: { priority: 'asc' },
    });

    if (!activeConfig || activeConfig.provider !== PaymentProvider.MERCADO_PAGO) {
      this.logger.debug(
        `Skipping payment ${input.aggregateId} as active provider is not Mercado Pago`,
      );
      return;
    }

    // Call orchestrator
    // We assume actorUserId is system since it's async
    await this.orchestrator.orchestrate(
      payment.tenantId,
      payment,
      payment.customer,
      'SYSTEM',
      activeConfig.id,
    );
    this.logger.log(`Successfully orchestrated Mercado Pago payment ${input.aggregateId}`);
  }
}
