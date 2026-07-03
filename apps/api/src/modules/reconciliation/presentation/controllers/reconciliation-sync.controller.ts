import { Body, Controller, Post } from '@nestjs/common';
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
import { ReconciliationSyncRequestDto } from '../../application/dto/reconciliation-sync-request.dto';
import { ReconciliationSyncService } from '../../application/services/reconciliation-sync.service';
import { AsaasReconciliationProviderAdapter } from '../../infra/adapters/asaas-reconciliation-provider.adapter';

@ApiTags('Reconciliation')
@ApiBearerAuth('access-token')
@Controller('reconciliation/sync')
export class ReconciliationSyncController {
  constructor(
    private readonly syncService: ReconciliationSyncService,
    private readonly asaasAdapter: AsaasReconciliationProviderAdapter,
  ) {}

  @Post('asaas')
  @RequirePermissions('reconciliation:sync')
  @RequireCapabilities(ReconciliationCapabilities.Sync)
  @ApiOperation({ summary: 'Executar sync controlado de settlements Asaas' })
  @ApiOkResponse({ description: 'Resumo do sync de conciliação' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem capability de sync de conciliação' })
  syncAsaas(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReconciliationSyncRequestDto,
  ) {
    return this.syncService.syncProvider(user.tenantId, user.id, this.asaasAdapter, {
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
      maxPages: dto.maxPages,
    });
  }
}
