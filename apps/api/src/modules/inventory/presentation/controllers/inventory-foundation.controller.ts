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

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('inventory/capabilities')
export class InventoryFoundationController {
  @Get('status')
  @RequirePermissions('inventory:read')
  @RequireCapabilities(CommerceCapabilities.InventoryManage)
  @ApiOperation({ summary: 'Consultar status da fundação do módulo Inventory' })
  @ApiOkResponse({
    schema: {
      example: { module: 'inventory', status: 'foundation_ready' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Inventory',
  })
  getStatus() {
    return { module: 'inventory', status: 'foundation_ready' };
  }
}
