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

@ApiTags('Catalog')
@ApiBearerAuth('access-token')
@Controller('catalog/capabilities')
export class CatalogFoundationController {
  @Get('status')
  @RequirePermissions('catalog:read')
  @RequireCapabilities(CommerceCapabilities.CatalogManage)
  @ApiOperation({ summary: 'Consultar status da fundação do módulo Catalog' })
  @ApiOkResponse({
    schema: {
      example: { module: 'catalog', status: 'foundation_ready' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Catalog',
  })
  getStatus() {
    return { module: 'catalog', status: 'foundation_ready' };
  }
}
