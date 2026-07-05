import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { CreateReconciliationDecisionDto } from '../../application/dto/create-reconciliation-decision.dto';
import { ListReconciliationCasesQueryDto } from '../../application/dto/list-reconciliation-cases-query.dto';
import {
  PaginatedReconciliationCasesResponseDto,
  ReconciliationCaseResponseDto,
} from '../../application/dto/reconciliation-case-response.dto';
import { ReconciliationCasesService } from '../../application/services/reconciliation-cases.service';
import { ReconciliationDecisionsService } from '../../application/services/reconciliation-decisions.service';

@ApiTags('Reconciliation')
@ApiBearerAuth('access-token')
@Controller('reconciliation/cases')
export class ReconciliationCasesController {
  constructor(
    private readonly reconciliationCasesService: ReconciliationCasesService,
    private readonly reconciliationDecisionsService: ReconciliationDecisionsService,
  ) {}

  @Get()
  @RequirePermissions('reconciliation:read')
  @RequireCapabilities(ReconciliationCapabilities.Read)
  @ApiOperation({ summary: 'Listar casos de conciliação do tenant' })
  @ApiOkResponse({ type: PaginatedReconciliationCasesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Reconciliation',
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListReconciliationCasesQueryDto) {
    return this.reconciliationCasesService.listCases(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('reconciliation:read')
  @RequireCapabilities(ReconciliationCapabilities.Read)
  @ApiOperation({ summary: 'Consultar detalhe de um caso de conciliação' })
  @ApiOkResponse({ type: ReconciliationCaseResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Reconciliation',
  })
  @ApiNotFoundResponse({ description: 'Caso de conciliação não encontrado' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reconciliationCasesService.getCase(user.tenantId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions('reconciliation:read')
  @RequireCapabilities(ReconciliationCapabilities.Read)
  @ApiOperation({ summary: 'Consultar timeline de decisões do caso de conciliação' })
  @ApiOkResponse({ description: 'Timeline retornada' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Reconciliation',
  })
  @ApiNotFoundResponse({ description: 'Caso de conciliação não encontrado' })
  timeline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reconciliationCasesService.getTimeline(user.tenantId, id);
  }

  @Post(':id/decisions')
  @RequirePermissions('reconciliation:manage')
  @RequireCapabilities(ReconciliationCapabilities.Manage)
  @ApiOperation({ summary: 'Registrar decisão manual em um caso de conciliação' })
  @ApiOkResponse({ description: 'Decisão registrada' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para gerenciar Reconciliation',
  })
  @ApiNotFoundResponse({ description: 'Caso ou pagamento não encontrado' })
  createDecision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReconciliationDecisionDto,
  ) {
    return this.reconciliationDecisionsService.createDecision(user.tenantId, user.id, id, dto);
  }
}
