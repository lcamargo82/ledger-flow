/* eslint-disable */
import { Injectable } from '@nestjs/common';
import {
  GatewayConfiguration,
  GatewayEnvironment,
  GatewayConfigurationStatus,
  PaymentProvider,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { GatewayConfigurationsRepository, UpsertGatewayConfigurationInput } from '../../domain/repositories/gateway-configurations.repository';

@Injectable()
export class PrismaGatewayConfigurationsRepository implements GatewayConfigurationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdAndTenant(id: string, tenantId: string): Promise<GatewayConfiguration | null> {
    return this.prisma.gatewayConfiguration.findUnique({
      where: {
        id,
        tenantId,
      },
    });
  }

  async findActiveByTenantAndProvider(
    tenantId: string,
    provider: PaymentProvider,
    environment?: GatewayEnvironment,
  ): Promise<GatewayConfiguration | null> {
    const where: any = {
      tenantId,
      provider,
      status: GatewayConfigurationStatus.ACTIVE,
    };

    if (environment) {
      where.environment = environment;
    }

    return this.prisma.gatewayConfiguration.findFirst({
      where,
      orderBy: { priority: 'asc' },
    });
  }

  async findDefaultActiveByTenant(
    tenantId: string,
    environment?: GatewayEnvironment,
  ): Promise<GatewayConfiguration | null> {
    const where: any = {
      tenantId,
      status: GatewayConfigurationStatus.ACTIVE,
    };

    if (environment) {
      where.environment = environment;
    }

    return this.prisma.gatewayConfiguration.findFirst({
      where,
      orderBy: { priority: 'asc' },
    });
  }

  async findByTenant(tenantId: string): Promise<GatewayConfiguration[]> {
    return this.prisma.gatewayConfiguration.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    tenantId: string;
    provider: PaymentProvider;
    environment: GatewayEnvironment;
    status?: GatewayConfigurationStatus;
    priority?: number;
    displayName?: string;
    supportedMethods?: any;
    encryptedCredentials?: string;
    credentialsFingerprint?: string;
  }): Promise<GatewayConfiguration> {
    return this.prisma.gatewayConfiguration.create({
      data,
    });
  }

  async upsert(input: UpsertGatewayConfigurationInput): Promise<GatewayConfiguration> {
    const { tenantId, provider, environment, ...rest } = input;
    return this.prisma.gatewayConfiguration.upsert({
      where: {
        tenantId_provider_environment: {
          tenantId,
          provider,
          environment,
        },
      },
      update: {
        status: rest.status,
        priority: rest.priority,
        displayName: rest.displayName,
        supportedMethods: rest.supportedMethods,
        encryptedCredentials: rest.encryptedCredentials,
        credentialsFingerprint: rest.credentialsFingerprint,
        healthStatus: rest.healthStatus,
      },
      create: {
        tenantId,
        provider,
        environment,
        status: rest.status,
        priority: rest.priority,
        displayName: rest.displayName,
        supportedMethods: rest.supportedMethods,
        encryptedCredentials: rest.encryptedCredentials,
        credentialsFingerprint: rest.credentialsFingerprint,
        healthStatus: rest.healthStatus,
      },
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: GatewayConfigurationStatus,
  ): Promise<GatewayConfiguration> {
    return this.prisma.gatewayConfiguration.update({
      where: {
        id,
        tenantId,
      },
      data: {
        status,
      },
    });
  }
}
