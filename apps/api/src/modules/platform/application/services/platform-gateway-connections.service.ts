import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { GatewayConfigurationStatus, GatewayConfiguration } from '@prisma/client';
import {
  PlatformGatewayConnectionResponseDto,
  UpdatePlatformGatewayConnectionStatusDto,
} from '../dto/platform-gateway-connections.dto';

@Injectable()
export class PlatformGatewayConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listConnections(): Promise<PlatformGatewayConnectionResponseDto[]> {
    // We could apply filters here from params if needed
    const connections = await this.prisma.gatewayConfiguration.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // simplified for now
    });

    return connections.map((c) => this.mapToResponse(c));
  }

  async updateStatus(
    id: string,
    dto: UpdatePlatformGatewayConnectionStatusDto,
  ): Promise<PlatformGatewayConnectionResponseDto> {
    const existing = await this.prisma.gatewayConfiguration.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Gateway connection not found');
    }

    if (
      dto.status !== GatewayConfigurationStatus.ACTIVE &&
      dto.status !== GatewayConfigurationStatus.INACTIVE
    ) {
      throw new BadRequestException(
        'Platform Admin can only set status to ACTIVE or INACTIVE',
      );
    }

    if (!dto.reason || dto.reason.length < 10) {
      throw new BadRequestException(
        'Reason is required and must be at least 10 characters long',
      );
    }

    const updated = await this.prisma.gatewayConfiguration.update({
      where: { id },
      data: { status: dto.status },
    });

    // We should also register an audit log for this action here
    // Audit actions: platform.gateway.connection.suspended / reactivated

    return this.mapToResponse(updated);
  }

  private mapToResponse(entity: GatewayConfiguration): PlatformGatewayConnectionResponseDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      provider: entity.provider,
      environment: entity.environment,
      status: entity.status,
      healthStatus: entity.healthStatus,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastFailureAt: entity.lastHealthCheckAt,
      lastSuccessfulOperationAt: null,
    };
  }
}
