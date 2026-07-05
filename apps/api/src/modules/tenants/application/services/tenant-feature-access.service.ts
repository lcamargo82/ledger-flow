import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';

export const TENANT_FEATURES = {
  GATEWAY_CONNECTIONS: 'gateway_connections',
  ASAAS_GATEWAY: 'asaas_gateway',
  MERCADO_PAGO_GATEWAY: 'mercado_pago_gateway',
  MULTI_GATEWAY: 'multi_gateway',
  INVENTORY_MANAGEMENT: 'inventory_management',
  COMMERCE_CHANNELS: 'commerce_channels',
  RECONCILIATION: 'reconciliation',
  ADVANCED_REPORTS: 'advanced_reports',
} as const;

export type TenantFeature = (typeof TENANT_FEATURES)[keyof typeof TENANT_FEATURES];

export interface ITenantFeatureAccessService {
  assertAccess(input: { tenantId: string; feature: TenantFeature }): Promise<void>;
  hasAccess(input: { tenantId: string; feature: TenantFeature }): Promise<boolean>;
}

@Injectable()
export class TenantFeatureAccessService implements ITenantFeatureAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(input: { tenantId: string; feature: TenantFeature }): Promise<void> {
    const has = await this.hasAccess(input);
    if (!has) {
      throw new ForbiddenException(`Feature ${input.feature} is not available for this tenant.`);
    }
  }

  async hasAccess(input: { tenantId: string; feature: TenantFeature }): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
    });

    if (!tenant) {
      return false;
    }

    // Tenant interno PLATFORM
    // acesso total por padrão
    if (tenant.slug === 'ledgerflow-platform') {
      return true;
    }

    // Tenant CUSTOMER
    // acesso permitido por padrão nesta fase
    // sem bloqueio comercial ainda
    return true;
  }
}
