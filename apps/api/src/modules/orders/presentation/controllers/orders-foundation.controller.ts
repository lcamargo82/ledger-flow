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

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders/capabilities')
export class OrdersFoundationController {
  @Get('status')
  @RequirePermissions('orders:read')
  @RequireCapabilities(CommerceCapabilities.OrdersManage)
  @ApiOperation({ summary: 'Consultar status da fundação do módulo Orders' })
  @ApiOkResponse({
    schema: {
      example: { module: 'orders', status: 'foundation_ready' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Orders',
  })
  getStatus() {
    return { module: 'orders', status: 'foundation_ready' };
  }
}
