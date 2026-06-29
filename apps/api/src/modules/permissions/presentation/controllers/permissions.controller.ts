import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService } from '../../application/services/permissions.service';
import { PermissionsResponseDto } from '../../application/dto/permissions-response.dto';
import { JwtAuthGuard } from '../../../../modules/auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../modules/auth/presentation/guards/permission.guard';
import { RequirePermissions } from '../../../../modules/auth/presentation/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../../modules/auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../../modules/auth/application/types/authenticated-user.type';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permissions:read')
  @ApiOperation({ summary: 'List all global permissions' })
  @ApiOkResponse({ type: PermissionsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - requires permissions:read permission',
  })
  async listPermissions(@CurrentUser() user: AuthenticatedUser): Promise<PermissionsResponseDto> {
    return this.permissionsService.listPermissions(user);
  }
}
