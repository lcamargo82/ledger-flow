import { Controller, Get, Query } from '@nestjs/common';
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
import { ListOrderFinancialFactsQueryDto } from '../../application/dto/list-order-financial-facts-query.dto';
import {
  FinancialDashboardResponseDto,
  PaginatedOrderFinancialFactsResponseDto,
} from '../../application/dto/financial-intelligence-response.dto';
import { FinancialIntelligenceService } from '../../application/services/financial-intelligence.service';

@ApiTags('Financial Intelligence')
@ApiBearerAuth('access-token')
@Controller('financial-intelligence')
@RequirePermissions('financial-intelligence:read')
@RequireCapabilities(CommerceCapabilities.FinancialAnalyticsRead)
export class FinancialIntelligenceController {
  constructor(private readonly financialService: FinancialIntelligenceService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Consultar indicadores operacionais de margem por pedido' })
  @ApiOkResponse({ type: FinancialDashboardResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability financeira' })
  getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOrderFinancialFactsQueryDto,
  ) {
    return this.financialService.getDashboard(user.tenantId, query);
  }

  @Get('order-facts')
  @ApiOperation({ summary: 'Listar fatos financeiros operacionais de pedidos' })
  @ApiOkResponse({ type: PaginatedOrderFinancialFactsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability financeira' })
  listFacts(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOrderFinancialFactsQueryDto) {
    return this.financialService.listFacts(user.tenantId, query);
  }
}
