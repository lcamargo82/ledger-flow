import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import {
  ListMarketplaceSettlementEventsQueryDto,
  MarketplaceSettlementDashboardQueryDto,
  MarketplaceSettlementDashboardResponseDto,
  MarketplaceSettlementEventsResponseDto,
  MarketplaceSettlementImportedTotalsDto,
  MarketplaceSettlementSyncResponseDto,
  SyncMarketplaceFinancialEventsDto,
} from '../../application/dto/marketplace-financial-ingestion.dto';
import { MarketplaceFinancialIngestionService } from '../../application/services/marketplace-financial-ingestion.service';

@ApiTags('Marketplace Settlement')
@ApiBearerAuth('access-token')
@Controller('marketplace-settlement/financial-accounts/:id')
export class MarketplaceFinancialIngestionController {
  constructor(private readonly ingestionService: MarketplaceFinancialIngestionService) {}

  @Post('sync')
  @RequirePermissions('marketplace-settlement:manage')
  @RequireCapabilities(ReconciliationCapabilities.MarketplaceSettlementManage)
  @ApiOperation({ summary: 'Sincronizar eventos financeiros Mercado Pago por período' })
  @ApiOkResponse({ type: MarketplaceSettlementSyncResponseDto })
  @ApiBadRequestResponse({ description: 'Período inválido ou conexão sem readiness financeira' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de marketplace settlement' })
  sync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SyncMarketplaceFinancialEventsDto,
  ): Promise<MarketplaceSettlementSyncResponseDto> {
    return this.ingestionService.syncMercadoPagoByPeriod(user.tenantId, user.id, id, dto);
  }

  @Get('events')
  @RequirePermissions('marketplace-settlement:read')
  @RequireCapabilities(ReconciliationCapabilities.MarketplaceSettlementRead)
  @ApiOperation({ summary: 'Listar eventos financeiros importados de uma conta marketplace' })
  @ApiOkResponse({ type: MarketplaceSettlementEventsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de marketplace settlement' })
  listEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListMarketplaceSettlementEventsQueryDto,
  ) {
    return this.ingestionService.listEvents(user.tenantId, id, query);
  }

  @Get('totals')
  @RequirePermissions('marketplace-settlement:read')
  @RequireCapabilities(ReconciliationCapabilities.MarketplaceSettlementRead)
  @ApiOperation({ summary: 'Consultar totais importados de uma conta marketplace' })
  @ApiOkResponse({ type: MarketplaceSettlementImportedTotalsDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de marketplace settlement' })
  getTotals(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<MarketplaceSettlementImportedTotalsDto> {
    return this.ingestionService.getImportedTotals(user.tenantId, id);
  }

  @Get('dashboard')
  @RequirePermissions('marketplace-settlement:read')
  @RequireCapabilities(ReconciliationCapabilities.MarketplaceSettlementRead)
  @ApiOperation({ summary: 'Consultar cash position e P&L operacional marketplace' })
  @ApiOkResponse({ type: MarketplaceSettlementDashboardResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de marketplace settlement' })
  getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: MarketplaceSettlementDashboardQueryDto,
  ): Promise<MarketplaceSettlementDashboardResponseDto> {
    return this.ingestionService.getDashboard(user.tenantId, id, query);
  }
}
