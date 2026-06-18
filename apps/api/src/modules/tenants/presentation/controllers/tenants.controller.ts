import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { TenantsService } from '../../application/services/tenants.service';
import { TenantResponseDto } from '../../application/dto/tenant-response.dto';
import { UpdateCurrentTenantDto } from '../../application/dto/update-current-tenant.dto';
import { JwtAuthGuard } from '../../../../modules/auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../modules/auth/presentation/guards/permission.guard';
import { RequirePermissions } from '../../../../modules/auth/presentation/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../modules/auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../../modules/auth/application/types/authenticated-user.type';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant details' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getCurrentTenant(@CurrentUser() user: AuthenticatedUser): Promise<TenantResponseDto> {
    // Basic endpoint that doesn't strictly need extra permissions
    return this.tenantsService.getCurrentTenant(user.tenantId);
  }

  @Patch('current')
  @RequirePermissions('tenant:update')
  @ApiOperation({ summary: 'Update current tenant details' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - requires tenant:update permission' })
  async updateCurrentTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDto: UpdateCurrentTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.updateCurrentTenant(user.tenantId, updateDto);
  }
}
