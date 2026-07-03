import { Controller, Get, Param, Query } from '@nestjs/common';
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
import { ListReconciliationCasesQueryDto } from '../../application/dto/list-reconciliation-cases-query.dto';
import {
  PaginatedReconciliationCasesResponseDto,
  ReconciliationCaseResponseDto,
} from '../../application/dto/reconciliation-case-response.dto';
import { ReconciliationCasesService } from '../../application/services/reconciliation-cases.service';

@ApiTags('Reconciliation')
@ApiBearerAuth('access-token')
@Controller('reconciliation/cases')
export class ReconciliationCasesController {
  constructor(private readonly reconciliationCasesService: ReconciliationCasesService) {}

  @Get()
  @RequirePermissions('reconciliation:read')
  @RequireCapabilities(ReconciliationCapabilities.Read)
  @ApiOperation({ summary: 'Listar casos de conciliação do tenant' })
  @ApiOkResponse({ type: PaginatedReconciliationCasesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({
    description: 'Sem permissão ou capability para acessar Reconciliation',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReconciliationCasesQueryDto,
  ) {
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
}
