import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/presentation/guards/permission.guard';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { AuthTokenPayload } from '../../../auth/application/types/auth-token-payload.type';
import { GatewayConnectionsService } from '../../application/services/gateway-connections.service';
import {
  TenantFeatureAccessService,
  TENANT_FEATURES,
} from '../../../tenants/application/services/tenant-feature-access.service';
import {
  CreateAsaasGatewayConnectionDto,
  UpdateGatewayConnectionDto,
  UpdateGatewayCredentialsDto,
  UpdateGatewayConnectionStatusDto,
  GatewayConnectionResponseDto,
} from '../../application/dto/gateway-connections.dto';

@ApiTags('Gateway Connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('gateways/connections')
export class GatewayConnectionsController {
  constructor(
    private readonly gatewayConnectionsService: GatewayConnectionsService,
    private readonly featureAccessService: TenantFeatureAccessService,
  ) {}

  @Get()
  @RequirePermissions('gateways:read')
  @ApiOperation({ summary: 'List tenant gateway connections' })
  @ApiResponse({ status: 200, type: [GatewayConnectionResponseDto] })
  async listConnections(
    @CurrentUser() user: AuthTokenPayload,
  ): Promise<{ data: GatewayConnectionResponseDto[] }> {
    await this.featureAccessService.assertAccess({
      tenantId: user.tenantId,
      feature: TENANT_FEATURES.GATEWAY_CONNECTIONS,
    });
    const connections = await this.gatewayConnectionsService.listConnections(
      user.tenantId,
    );
    return { data: connections };
  }

  @Post('asaas')
  @RequirePermissions('gateways:create')
  @ApiOperation({ summary: 'Create Asaas Sandbox Connection' })
  @ApiResponse({ status: 201, type: GatewayConnectionResponseDto })
  async createAsaasSandboxConnection(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateAsaasGatewayConnectionDto,
  ): Promise<GatewayConnectionResponseDto> {
    await this.featureAccessService.assertAccess({
      tenantId: user.tenantId,
      feature: TENANT_FEATURES.GATEWAY_CONNECTIONS,
    });
    return this.gatewayConnectionsService.createAsaasSandboxConnection(
      user.tenantId,
      dto,
    );
  }

  @Patch(':id')
  @RequirePermissions('gateways:update')
  @ApiOperation({ summary: 'Update gateway connection settings' })
  @ApiResponse({ status: 200, type: GatewayConnectionResponseDto })
  async updateConnection(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGatewayConnectionDto,
  ): Promise<GatewayConnectionResponseDto> {
    await this.featureAccessService.assertAccess({
      tenantId: user.tenantId,
      feature: TENANT_FEATURES.GATEWAY_CONNECTIONS,
    });
    return this.gatewayConnectionsService.updateConnection(
      user.tenantId,
      id,
      dto,
    );
  }

  @Post(':id/credentials')
  @RequirePermissions('gateways:manage')
  @ApiOperation({ summary: 'Update gateway connection credentials' })
  @ApiResponse({ status: 200, type: GatewayConnectionResponseDto })
  async updateCredentials(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGatewayCredentialsDto,
  ): Promise<GatewayConnectionResponseDto> {
    await this.featureAccessService.assertAccess({
      tenantId: user.tenantId,
      feature: TENANT_FEATURES.GATEWAY_CONNECTIONS,
    });
    return this.gatewayConnectionsService.updateCredentials(
      user.tenantId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @RequirePermissions('gateways:manage')
  @ApiOperation({ summary: 'Activate or deactivate a gateway connection' })
  @ApiResponse({ status: 200, type: GatewayConnectionResponseDto })
  async updateStatus(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGatewayConnectionStatusDto,
  ): Promise<GatewayConnectionResponseDto> {
    await this.featureAccessService.assertAccess({
      tenantId: user.tenantId,
      feature: TENANT_FEATURES.GATEWAY_CONNECTIONS,
    });
    return this.gatewayConnectionsService.updateStatus(
      user.tenantId,
      id,
      dto.status,
    );
  }
}
