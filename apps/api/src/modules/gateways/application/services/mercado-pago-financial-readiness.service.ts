import {
  GatewayConfiguration,
  GatewayConfigurationStatus,
  GatewayHealthStatus,
  PaymentProvider,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { GatewayCredentialsEncryptionService } from './gateway-credentials-encryption.service';
import { GatewayFinancialReadinessDto } from '../dto/gateway-connections.dto';

const MERCADO_PAGO_FINANCIAL_REQUIRED_SCOPES = ['offline_access', 'read'] as const;
const REAUTH_REQUIRED_STATUS = 'REAUTH_REQUIRED' as GatewayConfigurationStatus;

@Injectable()
export class MercadoPagoFinancialReadinessService {
  constructor(private readonly encryptionService: GatewayCredentialsEncryptionService) {}

  evaluate(entity: GatewayConfiguration): GatewayFinancialReadinessDto | undefined {
    if (entity.provider !== PaymentProvider.MERCADO_PAGO) {
      return undefined;
    }

    const base = {
      provider: entity.provider,
      connectionStatus: entity.status,
      healthStatus: entity.healthStatus,
      requiredScopes: [...MERCADO_PAGO_FINANCIAL_REQUIRED_SCOPES],
      grantedScopes: this.extractMercadoPagoScopes(entity),
      lastHealthCheckAt: entity.lastHealthCheckAt,
      lastHealthCheckMessage: entity.lastHealthCheckMessage,
      lastFinancialSyncAt: null,
    };

    if (!entity.encryptedCredentials) {
      return {
        ...base,
        state: 'NOT_CONFIGURED',
        canReadSettlements: false,
        missingScopes: [...MERCADO_PAGO_FINANCIAL_REQUIRED_SCOPES],
        reason: 'MERCADO_PAGO_CREDENTIALS_NOT_CONFIGURED',
      };
    }

    if (entity.status === REAUTH_REQUIRED_STATUS) {
      return {
        ...base,
        state: 'REAUTH_REQUIRED',
        canReadSettlements: false,
        missingScopes: this.missingFinancialScopes(base.grantedScopes),
        reason: 'MERCADO_PAGO_REAUTH_REQUIRED',
      };
    }

    if (entity.status !== GatewayConfigurationStatus.ACTIVE) {
      return {
        ...base,
        state: 'PAYMENT_ONLY',
        canReadSettlements: false,
        missingScopes: this.missingFinancialScopes(base.grantedScopes),
        reason: 'MERCADO_PAGO_CONNECTION_NOT_ACTIVE',
      };
    }

    if (
      entity.healthStatus === GatewayHealthStatus.DEGRADED ||
      entity.healthStatus === GatewayHealthStatus.UNHEALTHY
    ) {
      return {
        ...base,
        state: 'UNHEALTHY',
        canReadSettlements: false,
        missingScopes: this.missingFinancialScopes(base.grantedScopes),
        reason: entity.lastHealthCheckMessage ?? 'MERCADO_PAGO_CONNECTION_UNHEALTHY',
      };
    }

    const missingScopes = this.missingFinancialScopes(base.grantedScopes);
    if (missingScopes.length > 0) {
      return {
        ...base,
        state: 'PAYMENT_ONLY',
        canReadSettlements: false,
        missingScopes,
        reason: 'MERCADO_PAGO_FINANCIAL_SCOPE_MISSING',
      };
    }

    return {
      ...base,
      state: 'SETTLEMENT_READY',
      canReadSettlements: true,
      missingScopes: [],
      reason: undefined,
    };
  }

  assertSettlementReadable(entity: GatewayConfiguration): void {
    const readiness = this.evaluate(entity);
    if (!readiness?.canReadSettlements) {
      throw new Error(readiness?.reason ?? 'MERCADO_PAGO_FINANCIAL_READINESS_BLOCKED');
    }
  }

  private extractMercadoPagoScopes(entity: GatewayConfiguration): string[] {
    if (!entity.encryptedCredentials) return [];

    try {
      const credentials = this.encryptionService.decrypt(entity.encryptedCredentials);
      const rawScope = credentials.scope;
      if (!rawScope || typeof rawScope !== 'string') return [];

      return Array.from(
        new Set(
          rawScope
            .split(/[,\s]+/)
            .map((scope) => scope.trim())
            .filter(Boolean),
        ),
      ).sort();
    } catch {
      return [];
    }
  }

  private missingFinancialScopes(grantedScopes: string[]): string[] {
    return MERCADO_PAGO_FINANCIAL_REQUIRED_SCOPES.filter((scope) => !grantedScopes.includes(scope));
  }
}
