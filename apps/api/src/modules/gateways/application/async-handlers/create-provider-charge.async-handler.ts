import { Injectable, Logger } from '@nestjs/common';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';
import { NonRetryableAsyncJobError } from '../../../async/domain/errors/non-retryable-async-job.error';
import { GatewayPaymentOrchestrationService } from '../services/gateway-payment-orchestration.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';

@Injectable()
export class CreateProviderChargeAsyncHandler implements AsyncEventHandler {
  readonly eventType = 'payment.provider_charge_creation_requested';
  readonly consumerName = 'CreateProviderChargeAsyncHandler';
  private readonly logger = new Logger(CreateProviderChargeAsyncHandler.name);

  constructor(
    private readonly orchestrator: GatewayPaymentOrchestrationService,
    private readonly prisma: PrismaService,
  ) {}

  async handle(input: AsyncMessageEnvelope): Promise<void> {
    const payload = input.payload as Record<string, unknown> | undefined;
    const paymentId = (payload?.paymentId as string) || input.aggregateId;
    this.logger.log(`Handling charge creation for payment ${paymentId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { customer: true },
    });

    if (!payment) {
      this.logger.error(`Payment ${paymentId} not found`);
      throw new Error(`Payment ${paymentId} not found`);
    }

    if (payment.executionMode !== 'EXTERNAL_GATEWAY') {
      this.logger.log(
        `Payment ${paymentId} execution mode is ${payment.executionMode}. Skipping.`,
      );
      return;
    }

    if (payment.providerPaymentId) {
      this.logger.log(
        `Payment ${paymentId} already processed (has provider ID)`,
      );
      return; // Safe idempotency
    }

    let gatewayConfigurationId =
      payment.gatewayConfigurationId ||
      (payload?.gatewayConfigurationId as string);

    if (!gatewayConfigurationId) {
      // If payment has no explicit gateway, we might fallback to active config
      const activeConfig = await this.prisma.gatewayConfiguration.findFirst({
        where: {
          tenantId: payment.tenantId,
          status: 'ACTIVE',
        },
        orderBy: { priority: 'asc' },
      });

      if (!activeConfig) {
        throw new NonRetryableAsyncJobError(
          `Payment ${paymentId} does not have a gateway configuration assigned and no active configuration was found.`,
          'NO_GATEWAY_CONFIG',
        );
      }
      gatewayConfigurationId = activeConfig.id;
    }

    const config = await this.prisma.gatewayConfiguration.findUnique({
      where: { id: gatewayConfigurationId },
    });

    if (!config || config.status !== 'ACTIVE') {
      throw new NonRetryableAsyncJobError(
        `Gateway configuration ${gatewayConfigurationId} is invalid or inactive`,
        'INVALID_GATEWAY_CONFIG',
      );
    }

    const allowedEnv =
      process.env.PAYMENT_GATEWAY_ALLOWED_ENVIRONMENTS || 'SANDBOX';
    if (config.environment !== allowedEnv) {
      throw new NonRetryableAsyncJobError(
        `Gateway configuration environment (${config.environment}) is not allowed by process (${allowedEnv})`,
        'ENV_NOT_ALLOWED',
      );
    }

    // Call orchestrator
    // We assume actorUserId is system since it's async
    try {
      await this.orchestrator.orchestrate(
        payment.tenantId,
        payment,
        payment.customer,
        'SYSTEM',
        gatewayConfigurationId,
      );
      this.logger.log(
        `Successfully orchestrated payment ${paymentId} with provider ${config.provider}`,
      );
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.name === 'GatewayCredentialsInvalidError' ||
          error.name === 'GatewayConfigurationError')
      ) {
        this.logger.error(
          `[CreateProviderChargeAsyncHandler] Credentials for configuration ${gatewayConfigurationId} are invalid. Marking as non-retryable.`,
        );
        throw new NonRetryableAsyncJobError(
          'Não foi possível usar a credencial da integração. Atualize a credencial e tente novamente.',
          'INVALID_CREDENTIALS',
        );
      }
      throw error; // Will be retryable depending on error type (network, 5xx etc)
    }
  }
}
