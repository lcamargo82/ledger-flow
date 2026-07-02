import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
  InventoryReservationOperationResponseDto,
  PaginatedBalancesResponseDto,
  PaginatedMovementsResponseDto,
  PaginatedReservationsResponseDto,
} from '../../application/dto/inventory-response.dto';
import { ListInventoryQueryDto } from '../../application/dto/list-inventory-query.dto';
import { RecordAdjustmentDto } from '../../application/dto/record-adjustment.dto';
import { ReservationTransitionDto } from '../../application/dto/reservation-transition.dto';
import { ReserveStockDto } from '../../application/dto/reserve-stock.dto';
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

  @Post('reservations')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Criar reserva administrativa de estoque' })
  @ApiCreatedResponse({ type: InventoryReservationOperationResponseDto })
  @ApiBadRequestResponse({ description: 'Reserva inválida' })
  @ApiConflictResponse({
    description: 'Estoque disponível insuficiente ou idempotência inconsistente',
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventory' })
  reserveStock(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReserveStockDto) {
    return this.inventoryService.reserveStock(user.tenantId, user.id, dto);
  }

  @Get('reservations')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Listar reservas de estoque com paginação' })
  @ApiOkResponse({ type: PaginatedReservationsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventory' })
  listReservations(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInventoryQueryDto) {
    return this.inventoryService.listReservations(user.tenantId, query);
  }

  @Post('reservations/:id/release')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Liberar uma reserva ativa de estoque' })
  @ApiOkResponse({ type: InventoryReservationOperationResponseDto })
  @ApiBadRequestResponse({ description: 'Reserva não está ativa ou motivo inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventory' })
  releaseReservation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReservationTransitionDto,
  ) {
    return this.inventoryService.releaseReservation(id, user.tenantId, user.id, dto);
  }

  @Post('reservations/:id/consume')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Consumir integralmente uma reserva ativa de estoque' })
  @ApiOkResponse({ type: InventoryReservationOperationResponseDto })
  @ApiBadRequestResponse({ description: 'Reserva não está ativa ou motivo inválido' })
  @ApiConflictResponse({
    description: 'Saldo reservado insuficiente ou idempotência inconsistente',
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventory' })
  consumeReservation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReservationTransitionDto,
  ) {
    return this.inventoryService.consumeReservation(id, user.tenantId, user.id, dto);
  }
}
