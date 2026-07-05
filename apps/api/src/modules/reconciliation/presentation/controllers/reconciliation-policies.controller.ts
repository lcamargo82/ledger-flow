import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
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
import { ReconciliationCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import {
  CreateReconciliationPolicyDto,
  UpdateReconciliationPolicyDto,
} from '../../application/dto/create-reconciliation-policy.dto';
import { ListReconciliationPoliciesQueryDto } from '../../application/dto/list-reconciliation-policies-query.dto';
import { ReconciliationPolicyResponseDto } from '../../application/dto/reconciliation-policy-response.dto';
import { ReconciliationPoliciesService } from '../../application/services/reconciliation-policies.service';

@ApiTags('Reconciliation')
@ApiBearerAuth('access-token')
@Controller('reconciliation/policies')
export class ReconciliationPoliciesController {
  constructor(private readonly reconciliationPoliciesService: ReconciliationPoliciesService) {}

  @Get()
  @RequirePermissions('reconciliation:read')
  @RequireCapabilities(ReconciliationCapabilities.Read)
  @ApiOperation({ summary: 'Listar policies de conciliação do tenant' })
  @ApiOkResponse({ type: [ReconciliationPolicyResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem acesso à conciliação' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListReconciliationPoliciesQueryDto) {
    return this.reconciliationPoliciesService.listPolicies(user.tenantId, query);
  }

  @Post()
  @RequirePermissions('reconciliation:manage')
  @RequireCapabilities(ReconciliationCapabilities.Manage)
  @ApiOperation({ summary: 'Criar nova versão de policy de conciliação' })
  @ApiOkResponse({ type: ReconciliationPolicyResponseDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReconciliationPolicyDto) {
    return this.reconciliationPoliciesService.createPolicy(user.tenantId, user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('reconciliation:manage')
  @RequireCapabilities(ReconciliationCapabilities.Manage)
  @ApiOperation({ summary: 'Versionar policy de conciliação existente' })
  @ApiOkResponse({ type: ReconciliationPolicyResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReconciliationPolicyDto,
  ) {
    return this.reconciliationPoliciesService.updatePolicy(user.tenantId, user.id, id, dto);
  }

  @Post(':id/deactivate')
  @RequirePermissions('reconciliation:manage')
  @RequireCapabilities(ReconciliationCapabilities.Manage)
  @ApiOperation({ summary: 'Desativar policy de conciliação' })
  @ApiOkResponse({ type: ReconciliationPolicyResponseDto })
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reconciliationPoliciesService.deactivatePolicy(user.tenantId, user.id, id);
  }
}
