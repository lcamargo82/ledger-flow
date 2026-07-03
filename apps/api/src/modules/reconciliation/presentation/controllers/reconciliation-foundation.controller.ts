import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { RequireCapabilities } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { ReconciliationCapabilities } from '../../../platform/domain/constants/platform-capabilities';

@ApiTags('Reconciliation')
@ApiBearerAuth('access-token')
@Controller('reconciliation/capabilities')
export class ReconciliationFoundationController {
  @Get('status')
  @RequirePermissions('reconciliation:read')
  @RequireCapabilities(ReconciliationCapabilities.Read)
  @ApiOperation({
    summary: 'Consultar status da fundação do módulo Reconciliation',
  })
  @ApiOkResponse({
    schema: {
      example: { module: 'reconciliation', status: 'foundation_ready' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Reconciliation',
  })
  getStatus() {
    return { module: 'reconciliation', status: 'foundation_ready' };
  }
}
