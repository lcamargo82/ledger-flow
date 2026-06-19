import { Injectable } from '@nestjs/common';
import { PaymentProvider, GatewayEnvironment, GatewayConfiguration } from '@prisma/client';
import { GatewayConfigurationsRepository } from '../../domain/repositories/gateway-configurations.repository';
import { PaymentGatewayFactoryService } from './payment-gateway-factory.service';
import { IPaymentGateway } from '../../domain/interfaces/payment-gateway.interface';
import { GatewayNotConfiguredError } from '../../domain/errors/gateway-errors';

@Injectable()
export class PaymentGatewayResolverService {
  constructor(
    private readonly repository: GatewayConfigurationsRepository,
    private readonly factory: PaymentGatewayFactoryService,
  ) {}

  async resolve(
    tenantId: string,
    environment?: GatewayEnvironment,
    provider?: PaymentProvider,
  ): Promise<{ configuration: GatewayConfiguration; adapter: IPaymentGateway }> {
    let configuration: GatewayConfiguration | null = null;

    if (provider) {
      configuration = await this.repository.findActiveByTenantAndProvider(
        tenantId,
        provider,
        environment,
      );
    } else {
      configuration = await this.repository.findDefaultActiveByTenant(tenantId, environment);
    }

    if (!configuration) {
      console.warn(
        `[GatewayResolver] Configuration missing for tenant: ${tenantId}, provider: ${provider}, env: ${environment}`,
      );
      throw new GatewayNotConfiguredError(
        'Nenhuma configuração de gateway ativa foi encontrada para as condições solicitadas.',
      );
    }

    console.log(
      `[GatewayResolver] Gateway adapter initialized for provider: ${configuration.provider}`,
    );
    const adapter = this.factory.getAdapter(configuration.provider);

    return {
      configuration,
      adapter,
    };
  }
}
