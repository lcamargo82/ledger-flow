import { Controller, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantInvitationService } from '../../application/services/tenant-invitation.service';
import { PlatformAdminOnly } from '../../../auth/presentation/decorators/platform-admin-only.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';

@ApiTags('Platform Administration')
@ApiBearerAuth()
@Controller('platform/tenants/:id/invitation')
export class TenantInvitationsController {
  constructor(private readonly invitationService: TenantInvitationService) {}

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @PlatformAdminOnly()
  @RequirePermissions('platform:tenants:invite')
  @ApiOperation({ summary: 'Resend tenant invitation to the owner' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async resendInvitation(@Param('id') tenantId: string, @CurrentUser('id') userId: string) {
    return this.invitationService.resendInvitation(tenantId, userId);
  }
}
