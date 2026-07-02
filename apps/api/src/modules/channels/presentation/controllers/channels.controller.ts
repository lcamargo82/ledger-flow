import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { CreateChannelIntegrationDto } from '../../application/dto/create-channel-integration.dto';
import { ListChannelInboxQueryDto } from '../../application/dto/list-channel-inbox-query.dto';
import {
  ChannelIntegrationMutationResponseDto,
  ChannelIntegrationsResponseDto,
  PaginatedChannelInboxResponseDto,
} from '../../application/dto/channel-response.dto';
import { ChannelsService } from '../../application/services/channels.service';

@ApiTags('Channels')
@ApiBearerAuth('access-token')
@Controller('channels')
@RequireCapabilities(CommerceCapabilities.ChannelsConnect)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post('integrations')
  @RequirePermissions('channels:manage')
  @ApiOperation({ summary: 'Criar integração de canal para intake autenticado' })
  @ApiCreatedResponse({ type: ChannelIntegrationMutationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de canais' })
  async createIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChannelIntegrationDto,
  ) {
    const integration = await this.channelsService.createIntegration(user.tenantId, user.id, dto);
    return { integration };
  }

  @Get('integrations')
  @RequirePermissions('channels:read')
  @ApiOperation({ summary: 'Listar integrações de canais sem expor segredos' })
  @ApiOkResponse({ type: ChannelIntegrationsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de canais' })
  async listIntegrations(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.channelsService.listIntegrations(user.tenantId);
    return { data };
  }

  @Get('webhook-inbox')
  @RequirePermissions('channels:read')
  @ApiOperation({ summary: 'Listar inbox sanitizado de webhooks de canais' })
  @ApiOkResponse({ type: PaginatedChannelInboxResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de canais' })
  listInbox(@CurrentUser() user: AuthenticatedUser, @Query() query: ListChannelInboxQueryDto) {
    return this.channelsService.listInbox(user.tenantId, query);
  }
}
