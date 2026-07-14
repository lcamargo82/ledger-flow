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
import { ListSalesIntelligenceQueryDto } from '../../application/dto/list-sales-intelligence-query.dto';
import {
  PaginatedSalesIntelligenceResponseDto,
  SalesIntelligenceSummaryDto,
} from '../../application/dto/sales-intelligence-response.dto';
import { SalesIntelligenceService } from '../../application/services/sales-intelligence.service';

@ApiTags('Sales Intelligence')
@ApiBearerAuth('access-token')
@Controller('sales-intelligence')
@RequirePermissions('sales-intelligence:read')
@RequireCapabilities(CommerceCapabilities.SalesIntelligenceRead)
export class SalesIntelligenceController {
  constructor(private readonly service: SalesIntelligenceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vendas consolidadas por pedido' })
  @ApiOkResponse({ type: PaginatedSalesIntelligenceResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem acesso à inteligência de vendas' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListSalesIntelligenceQueryDto) {
    return this.service.list(user.tenantId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Consultar resumo consolidado de vendas' })
  @ApiOkResponse({ type: SalesIntelligenceSummaryDto })
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getSummary(user.tenantId);
  }
}
