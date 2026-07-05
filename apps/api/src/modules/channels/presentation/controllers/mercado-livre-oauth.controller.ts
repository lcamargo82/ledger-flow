import { Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import {
  MercadoLivreCallbackResponseDto,
  MercadoLivreConnectResponseDto,
  MercadoLivreDisconnectResponseDto,
} from '../../application/dto/mercado-livre-oauth-response.dto';
import { MercadoLivreOAuthService } from '../../application/services/mercado-livre-oauth.service';

@ApiTags('Channels')
@ApiBearerAuth('access-token')
@Controller('channels/mercado-livre')
export class MercadoLivreOAuthController {
  constructor(private readonly mercadoLivreOAuthService: MercadoLivreOAuthService) {}

  @Post('connect')
  @RequirePermissions('channels:manage')
  @RequireCapabilities(CommerceCapabilities.ChannelsConnect)
  @ApiOperation({ summary: 'Iniciar conexão OAuth do Mercado Livre pelo painel' })
  @ApiOkResponse({ type: MercadoLivreConnectResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de canais' })
  connect(@CurrentUser() user: AuthenticatedUser) {
    return this.mercadoLivreOAuthService.generateAuthorizationUrl(user.tenantId, user.id);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Receber callback OAuth do Mercado Livre sem expor tokens' })
  @ApiOkResponse({ type: MercadoLivreCallbackResponseDto })
  callback(@Query('code') code: string, @Query('state') state: string) {
    return this.mercadoLivreOAuthService.handleCallback(code, state);
  }

  @Post('integrations/:id/disconnect')
  @RequirePermissions('channels:manage')
  @RequireCapabilities(CommerceCapabilities.ChannelsConnect)
  @ApiOperation({ summary: 'Desconectar credenciais Mercado Livre da integração' })
  @ApiOkResponse({ type: MercadoLivreDisconnectResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de canais' })
  async disconnect(@CurrentUser() user: AuthenticatedUser, @Param('id') integrationId: string) {
    await this.mercadoLivreOAuthService.disconnect(user.tenantId, user.id, integrationId);
    return { disconnected: true };
  }
}
