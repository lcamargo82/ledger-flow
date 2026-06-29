import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { RolesService } from '../../application/services/roles.service';
import { RolesResponseDto } from '../../application/dto/roles-response.dto';
import { RoleResponseDto } from '../../application/dto/role-response.dto';
import { JwtAuthGuard } from '../../../../modules/auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../modules/auth/presentation/guards/permission.guard';
import { RequirePermissions } from '../../../../modules/auth/presentation/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../modules/auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../../modules/auth/application/types/authenticated-user.type';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'List roles for the current tenant' })
  @ApiOkResponse({ type: RolesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires roles:manage permission',
  })
  async listRoles(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RolesResponseDto> {
    return this.rolesService.listRoles(user);
  }

  @Get(':id')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Get role details by id' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires roles:manage permission',
  })
  async getRoleById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RoleResponseDto> {
    return this.rolesService.getRoleById(user, id);
  }
}
