import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { RequireCapabilities } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { ReconciliationCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { ReconciliationDashboardQueryDto } from '../../application/dto/reconciliation-dashboard-query.dto';
import { ReconciliationDashboardResponseDto } from '../../application/dto/reconciliation-dashboard-response.dto';
import { ReconciliationDashboardService } from '../../application/services/reconciliation-dashboard.service';

@ApiTags('Reconciliation')
@ApiBearerAuth('access-token')
@Controller('reconciliation/dashboard')
export class ReconciliationDashboardController {
  constructor(private readonly reconciliationDashboardService: ReconciliationDashboardService) {}

  @Get()
  @RequirePermissions('reconciliation:read')
  @RequireCapabilities(ReconciliationCapabilities.Read)
  @ApiOperation({ summary: 'Consultar dashboard de conciliação financeira' })
  @ApiOkResponse({ type: ReconciliationDashboardResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Reconciliation',
  })
  getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReconciliationDashboardQueryDto,
  ) {
    return this.reconciliationDashboardService.getDashboard(user.tenantId, query);
  }
}
