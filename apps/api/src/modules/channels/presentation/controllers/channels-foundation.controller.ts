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

@ApiTags('Channels')
@ApiBearerAuth('access-token')
@Controller('channels/capabilities')
export class ChannelsFoundationController {
  @Get('status')
  @RequirePermissions('channels:read')
  @RequireCapabilities(CommerceCapabilities.ChannelsConnect)
  @ApiOperation({ summary: 'Consultar status da fundação do módulo Channels' })
  @ApiOkResponse({
    schema: {
      example: { module: 'channels', status: 'foundation_ready' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Channels',
  })
  getStatus() {
    return { module: 'channels', status: 'foundation_ready' };
  }
}
