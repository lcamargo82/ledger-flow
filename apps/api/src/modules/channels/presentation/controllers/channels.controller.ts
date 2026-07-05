import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { ImportChannelListingsDto } from '../../application/dto/import-channel-listings.dto';
import { ListChannelInboxQueryDto } from '../../application/dto/list-channel-inbox-query.dto';
import { ListChannelListingsQueryDto } from '../../application/dto/list-channel-listings-query.dto';
import { ListInventorySyncQueryDto } from '../../application/dto/list-inventory-sync-query.dto';
import { MapChannelListingDto } from '../../application/dto/map-channel-listing.dto';
import {
  ChannelInventorySyncProcessSummaryDto,
  ChannelHealthResponseDto,
  ChannelListingMutationResponseDto,
  ChannelListingsImportResponseDto,
  ChannelIntegrationMutationResponseDto,
  ChannelIntegrationsResponseDto,
  ChannelReplayResponseDto,
  PaginatedChannelInventorySyncResponseDto,
  PaginatedChannelListingsResponseDto,
  PaginatedChannelInboxResponseDto,
} from '../../application/dto/channel-response.dto';
import { ChannelHealthReplayService } from '../../application/services/channel-health-replay.service';
import { ChannelInventorySyncService } from '../../application/services/channel-inventory-sync.service';
import { ChannelsService } from '../../application/services/channels.service';

@ApiTags('Channels')
@ApiBearerAuth('access-token')
@Controller('channels')
@RequireCapabilities(CommerceCapabilities.ChannelsConnect)
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly inventorySyncService: ChannelInventorySyncService,
    private readonly healthReplayService: ChannelHealthReplayService,
  ) {}

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

  @Get('health')
  @RequirePermissions('channels:read')
  @ApiOperation({ summary: 'Consultar saúde operacional sanitizada dos canais' })
  @ApiOkResponse({ type: ChannelHealthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de canais' })
  health(@CurrentUser() user: AuthenticatedUser) {
    return this.healthReplayService.getHealth(user.tenantId);
  }

  @Post('webhook-inbox/:id/replay')
  @RequirePermissions('channels:manage')
  @ApiOperation({ summary: 'Reenfileirar inbox de webhook de canal com falha' })
  @ApiCreatedResponse({ type: ChannelReplayResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de canais' })
  replayWebhookInbox(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.healthReplayService.replayWebhookInbox(user.tenantId, user.id, id);
  }

  @Post('integrations/:id/import-listings')
  @RequirePermissions('channels:manage')
  @RequireCapabilities(CommerceCapabilities.ChannelsImportListings)
  @ApiOperation({ summary: 'Importar anúncios do provider MOCK para malha fina' })
  @ApiCreatedResponse({ type: ChannelListingsImportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de importação' })
  importListings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ImportChannelListingsDto,
  ) {
    return this.channelsService.importListings(id, user.tenantId, user.id, dto);
  }

  @Get('listings/unmatched')
  @RequirePermissions('channels:read')
  @ApiOperation({ summary: 'Listar anúncios pendentes de malha fina' })
  @ApiOkResponse({ type: PaginatedChannelListingsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de canais' })
  listListings(@CurrentUser() user: AuthenticatedUser, @Query() query: ListChannelListingsQueryDto) {
    return this.channelsService.listListings(user.tenantId, query);
  }

  @Post('listings/:id/map')
  @RequirePermissions('channels:manage')
  @RequireCapabilities(CommerceCapabilities.ChannelsMappingManage)
  @ApiOperation({ summary: 'Mapear manualmente anúncio de canal para SKU do tenant' })
  @ApiCreatedResponse({ type: ChannelListingMutationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de mapping' })
  async mapListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MapChannelListingDto,
  ) {
    const listing = await this.channelsService.mapListing(id, user.tenantId, user.id, dto);
    return { listing };
  }

  @Get('inventory-sync/status')
  @RequirePermissions('channels:read')
  @RequireCapabilities(CommerceCapabilities.ChannelsSyncInventory)
  @ApiOperation({ summary: 'Listar status sanitizado da sincronização de estoque com canais' })
  @ApiOkResponse({ type: PaginatedChannelInventorySyncResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de sincronização' })
  listInventorySyncStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInventorySyncQueryDto,
  ) {
    return this.inventorySyncService.listStatus(user.tenantId, query);
  }

  @Post('inventory-sync/process-pending')
  @RequirePermissions('channels:manage')
  @RequireCapabilities(CommerceCapabilities.ChannelsSyncInventory)
  @ApiOperation({ summary: 'Processar pendências de sincronização de estoque do provider MOCK' })
  @ApiCreatedResponse({ type: ChannelInventorySyncProcessSummaryDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de sincronização' })
  processInventorySync(@CurrentUser() user: AuthenticatedUser) {
    return this.inventorySyncService.processPending(user.tenantId);
  }

  @Post('inventory-sync/:id/replay')
  @RequirePermissions('channels:manage')
  @RequireCapabilities(CommerceCapabilities.ChannelsSyncInventory)
  @ApiOperation({ summary: 'Reenfileirar sincronização de estoque de canal com falha' })
  @ApiCreatedResponse({ type: ChannelReplayResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de sincronização' })
  replayInventorySync(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.healthReplayService.replayInventorySync(user.tenantId, user.id, id);
  }
}
