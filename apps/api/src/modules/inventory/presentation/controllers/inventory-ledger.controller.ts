import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import {
  InventoryAdjustmentResponseDto,
  PaginatedBalancesResponseDto,
  PaginatedMovementsResponseDto,
} from '../../application/dto/inventory-response.dto';
import { ListInventoryQueryDto } from '../../application/dto/list-inventory-query.dto';
import { RecordAdjustmentDto } from '../../application/dto/record-adjustment.dto';
import { InventoryService } from '../../application/services/inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
@RequireCapabilities(CommerceCapabilities.InventoryManage)
export class InventoryLedgerController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements/adjustments')
  @RequirePermissions('inventory:adjust')
  @ApiOperation({ summary: 'Registrar ajuste de entrada ou saída no ledger' })
  @ApiCreatedResponse({ type: InventoryAdjustmentResponseDto })
  @ApiBadRequestResponse({ description: 'Ajuste inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventory' })
  recordAdjustment(@CurrentUser() user: AuthenticatedUser, @Body() dto: RecordAdjustmentDto) {
    return this.inventoryService.recordAdjustment(user.tenantId, user.id, dto);
  }

  @Get('balances')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Listar projeções de saldo' })
  @ApiOkResponse({ type: PaginatedBalancesResponseDto })
  listBalances(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInventoryQueryDto) {
    return this.inventoryService.listBalances(user.tenantId, query);
  }

  @Get('movements')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Listar movimentos imutáveis de estoque' })
  @ApiOkResponse({ type: PaginatedMovementsResponseDto })
  listMovements(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInventoryQueryDto) {
    return this.inventoryService.listMovements(user.tenantId, query);
  }
}
