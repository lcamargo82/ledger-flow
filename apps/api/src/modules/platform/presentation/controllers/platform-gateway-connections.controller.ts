import {
  Controller,
  Get,
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
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '@/modules/auth/presentation/guards/permission.guard';
import { RequirePermissions } from '@/modules/auth/presentation/decorators/require-permissions.decorator';
import { PlatformAdminGuard } from '@/modules/auth/presentation/guards/platform-admin.guard';
import { PlatformGatewayConnectionsService } from '../../application/services/platform-gateway-connections.service';
import {
  UpdatePlatformGatewayConnectionStatusDto,
  PlatformGatewayConnectionResponseDto,
} from '../../application/dto/platform-gateway-connections.dto';

@ApiTags('Platform Gateway Connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionGuard)
@Controller('platform/gateway-connections')
export class PlatformGatewayConnectionsController {
  constructor(private readonly service: PlatformGatewayConnectionsService) {}

  @Get()
  @RequirePermissions('platform:gateways:read')
  @ApiOperation({
    summary: 'List all tenant gateway connections for platform admin',
  })
  @ApiResponse({ status: 200, type: [PlatformGatewayConnectionResponseDto] })
  async listConnections(): Promise<{ data: PlatformGatewayConnectionResponseDto[] }> {
    const connections = await this.service.listConnections();
    return { data: connections };
  }

  @Patch(':id/status')
  @RequirePermissions('platform:gateways:status')
  @ApiOperation({
    summary: 'Suspend or reactivate a tenant gateway connection',
  })
  @ApiResponse({ status: 200, type: PlatformGatewayConnectionResponseDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformGatewayConnectionStatusDto,
  ): Promise<PlatformGatewayConnectionResponseDto> {
    return this.service.updateStatus(id, dto);
  }
}
