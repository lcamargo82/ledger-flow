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
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';

@ApiTags('Financial Intelligence')
@ApiBearerAuth('access-token')
@Controller('financial-intelligence/capabilities')
export class FinancialIntelligenceFoundationController {
  @Get('status')
  @RequirePermissions('financial-intelligence:read')
  @RequireCapabilities(CommerceCapabilities.FinancialAnalyticsRead)
  @ApiOperation({
    summary: 'Consultar status da fundação do módulo Financial Intelligence',
  })
  @ApiOkResponse({
    schema: {
      example: {
        module: 'financial-intelligence',
        status: 'foundation_ready',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description:
      'Sem permissão ou capability para acessar Financial Intelligence',
  })
  getStatus() {
    return {
      module: 'financial-intelligence',
      status: 'foundation_ready',
    };
  }
}
