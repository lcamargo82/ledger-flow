import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { GatewayCredentialsEncryptionService } from './gateway-credentials-encryption.service';
import {
  GatewayEnvironment,
  PaymentProvider,
  GatewayConfigurationStatus,
  PaymentMethod,
  GatewayConfiguration,
} from '@prisma/client';
import {
  CreateAsaasGatewayConnectionDto,
  UpdateGatewayConnectionDto,
  UpdateGatewayCredentialsDto,
  GatewayConnectionResponseDto,
} from '../dto/gateway-connections.dto';

@Injectable()
export class GatewayConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: GatewayCredentialsEncryptionService,
  ) {}

  async listConnections(tenantId: string): Promise<GatewayConnectionResponseDto[]> {
    const connections = await this.prisma.gatewayConfiguration.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map((c) => this.mapToResponse(c));
  }

  async createAsaasSandboxConnection(
    tenantId: string,
    dto: CreateAsaasGatewayConnectionDto,
  ): Promise<GatewayConnectionResponseDto> {
    if (dto.environment !== GatewayEnvironment.SANDBOX) {
      throw new BadRequestException(
        'Currently, only Asaas Sandbox environment is supported for creation via API.',
      );
    }

    const provider = PaymentProvider.ASAAS;
    const environment = GatewayEnvironment.SANDBOX;

    // Check if exists
    const existing = await this.prisma.gatewayConfiguration.findUnique({
      where: {
        tenantId_provider_environment: {
          tenantId,
          provider,
          environment,
        },
      },
    });

    const encryptedCredentials = this.encryptionService.encrypt({
      apiKey: dto.apiKey,
    });

    // Round-trip validation
    try {
      const decrypted = this.encryptionService.decrypt(JSON.stringify(encryptedCredentials));
      if (decrypted.apiKey !== dto.apiKey) {
        throw new Error('Decrypted value does not match');
      }
    } catch (err) {
      throw new BadRequestException(
        'The provided credential could not be validated and protected.',
      );
    }

    const fingerprint = this.encryptionService.createFingerprint({
      apiKey: dto.apiKey,
    });

    // In a real scenario, we could validate the API key calling Asaas API with a ping/validate endpoint here.

    const supportedMethods = dto.supportedMethods || [PaymentMethod.PIX, PaymentMethod.BOLETO];

    if (existing) {
      const updated = await this.prisma.gatewayConfiguration.update({
        where: { id: existing.id },
        data: {
          encryptedCredentials: JSON.stringify(encryptedCredentials),
          credentialsFingerprint: fingerprint,
          displayName: dto.displayName ?? existing.displayName,
          priority: dto.priority ?? existing.priority,
          supportedMethods: supportedMethods as any,
          status: GatewayConfigurationStatus.ACTIVE,
          healthStatus: 'UNKNOWN', // reset health
        },
      });
      return this.mapToResponse(updated);
    }

    const created = await this.prisma.gatewayConfiguration.create({
      data: {
        tenantId,
        provider,
        environment,
        status: GatewayConfigurationStatus.ACTIVE,
        encryptedCredentials: JSON.stringify(encryptedCredentials),
        credentialsFingerprint: fingerprint,
        displayName: dto.displayName || 'Asaas Sandbox',
        priority: dto.priority ?? 1,
        supportedMethods: supportedMethods as any,
        healthStatus: 'UNKNOWN',
      },
    });

    return this.mapToResponse(created);
  }

  async updateConnection(
    tenantId: string,
    id: string,
    dto: UpdateGatewayConnectionDto,
  ): Promise<GatewayConnectionResponseDto> {
    const existing = await this.prisma.gatewayConfiguration.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Gateway connection not found');
    }

    const updated = await this.prisma.gatewayConfiguration.update({
      where: { id },
      data: {
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.supportedMethods && {
          supportedMethods: dto.supportedMethods as any,
        }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return this.mapToResponse(updated);
  }

  async updateCredentials(
    tenantId: string,
    id: string,
    dto: UpdateGatewayCredentialsDto,
  ): Promise<GatewayConnectionResponseDto> {
    const existing = await this.prisma.gatewayConfiguration.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Gateway connection not found');
    }

    const encryptedCredentials = this.encryptionService.encrypt({
      apiKey: dto.apiKey,
    });

    // Round-trip validation
    try {
      const decrypted = this.encryptionService.decrypt(JSON.stringify(encryptedCredentials));
      if (decrypted.apiKey !== dto.apiKey) {
        throw new Error('Decrypted value does not match');
      }
    } catch (err) {
      throw new BadRequestException(
        'The provided credential could not be validated and protected.',
      );
    }

    const fingerprint = this.encryptionService.createFingerprint({
      apiKey: dto.apiKey,
    });

    const updated = await this.prisma.gatewayConfiguration.update({
      where: { id },
      data: {
        encryptedCredentials: JSON.stringify(encryptedCredentials),
        credentialsFingerprint: fingerprint,
        healthStatus: 'UNKNOWN', // Reset health upon credentials change
      },
    });

    return this.mapToResponse(updated);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: GatewayConfigurationStatus,
  ): Promise<GatewayConnectionResponseDto> {
    const existing = await this.prisma.gatewayConfiguration.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Gateway connection not found');
    }

    const updated = await this.prisma.gatewayConfiguration.update({
      where: { id },
      data: { status },
    });

    return this.mapToResponse(updated);
  }

  async disconnectConnection(tenantId: string, id: string): Promise<GatewayConnectionResponseDto> {
    const existing = await this.prisma.gatewayConfiguration.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Gateway connection not found');
    }

    const updated = await this.prisma.gatewayConfiguration.update({
      where: { id },
      data: {
        status: GatewayConfigurationStatus.DISABLED,
        encryptedCredentials: null,
        credentialsFingerprint: null,
        healthStatus: 'UNKNOWN',
      },
    });

    return this.mapToResponse(updated);
  }

  private mapToResponse(entity: GatewayConfiguration): GatewayConnectionResponseDto {
    return {
      id: entity.id,
      provider: entity.provider,
      environment: entity.environment,
      status: entity.status,
      priority: entity.priority,
      displayName: entity.displayName ?? undefined,
      supportedMethods: entity.supportedMethods as PaymentMethod[],
      healthStatus: entity.healthStatus,
      credentialsConfigured: !!entity.encryptedCredentials,
      lastFailureAt: entity.lastHealthCheckAt, // Mapping lastHealthCheckAt loosely to lastFailureAt if needed, or null
      lastSuccessfulOperationAt: null, // Placeholder as per instructions
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
