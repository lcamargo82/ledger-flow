import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  GatewayEnvironment,
  GatewayConfiguration,
  PaymentMethod,
} from '@prisma/client';
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

  private getAllowedEnvironment(): GatewayEnvironment {
    const env = process.env.PAYMENT_GATEWAY_ALLOWED_ENVIRONMENTS;
    if (env === 'LIVE') return GatewayEnvironment.LIVE;
    return GatewayEnvironment.SANDBOX;
  }

  async resolveByMethod(
    tenantId: string,
    method: PaymentMethod,
  ): Promise<{
    configuration: GatewayConfiguration;
    adapter: IPaymentGateway;
  }> {
    const allowedEnv = this.getAllowedEnvironment();

    // Fetch all active configurations for the tenant (we don't have findActiveByTenant without provider/env in repository interface? Let's use findByTenant and filter in memory since volume is small)
    const allConfigs = await this.repository.findByTenant(tenantId);

    // Filter ACTIVE and allowed environment
    const eligibleConfigs = allConfigs.filter(
      (c) => c.status === 'ACTIVE' && c.environment === allowedEnv,
    );

    // Filter by supportedMethods
    const methodConfigs = eligibleConfigs.filter((c) => {
      try {
        const methods = Array.isArray(c.supportedMethods)
          ? c.supportedMethods
          : [];
        return methods.includes(method);
      } catch (e) {
        return false;
      }
    });

    if (methodConfigs.length === 0) {
      console.warn(
        `[GatewayResolver] No active gateway configuration found for tenant ${tenantId} supporting method ${method} in environment ${allowedEnv}`,
      );
      throw new GatewayNotConfiguredError(
        'Nenhuma configuração de gateway ativa suporta o método selecionado no ambiente permitido.',
      );
    }

    // Sort by priority (asc means lower number = higher priority)
    methodConfigs.sort((a, b) => a.priority - b.priority);
    const configuration = methodConfigs[0];

    console.log(
      `[GatewayResolver] Gateway adapter initialized for provider: ${configuration.provider}`,
    );
    const adapter = this.factory.getAdapter(configuration.provider);

    return { configuration, adapter };
  }

  async resolve(
    tenantId: string,
    environment?: GatewayEnvironment,
    provider?: PaymentProvider,
  ): Promise<{
    configuration: GatewayConfiguration;
    adapter: IPaymentGateway;
  }> {
    let configuration: GatewayConfiguration | null = null;
    const resolvedEnv = environment || this.getAllowedEnvironment();

    if (provider) {
      configuration = await this.repository.findActiveByTenantAndProvider(
        tenantId,
        provider,
        resolvedEnv,
      );
    } else {
      configuration = await this.repository.findDefaultActiveByTenant(
        tenantId,
        resolvedEnv,
      );
    }

    if (!configuration) {
      console.warn(
        `[GatewayResolver] Configuration missing for tenant: ${tenantId}, provider: ${provider}, env: ${resolvedEnv}`,
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
