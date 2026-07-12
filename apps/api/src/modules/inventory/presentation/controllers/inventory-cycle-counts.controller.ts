import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { InventoryAdvancedCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { CreateCycleCountDto } from '../../application/dto/create-cycle-count.dto';
import {
  CycleCountApprovalResponseDto,
  CycleCountMutationResponseDto,
  PaginatedCycleCountsResponseDto,
} from '../../application/dto/inventory-response.dto';
import {
  ApproveCycleCountDto,
  CancelCycleCountDto,
  CountCycleCountItemDto,
} from '../../application/dto/cycle-count-transition.dto';
import { ListCycleCountsQueryDto } from '../../application/dto/list-cycle-counts-query.dto';
import {
  InventoryAdvancedFeature,
  InventoryAdvancedFeatureService,
} from '../../application/services/inventory-advanced-feature.service';
import { InventoryService } from '../../application/services/inventory.service';

@ApiTags('Inventory Cycle Counts')
@ApiBearerAuth('access-token')
@Controller('inventory/cycle-counts')
@RequirePermissions('inventory:cycle-count')
@RequireCapabilities(InventoryAdvancedCapabilities.CycleCount)
export class InventoryCycleCountsController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly features: InventoryAdvancedFeatureService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar rascunho de inventário cíclico' })
  @ApiCreatedResponse({ type: CycleCountMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Inventário inválido' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada, warehouse ou SKU inexistente' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventário cíclico' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCycleCountDto) {
    this.features.assertEnabled(InventoryAdvancedFeature.CYCLE_COUNTS);
    const cycleCount = await this.inventoryService.createCycleCount(user.tenantId, user.id, dto);
    return { cycleCount };
  }

  @Get()
  @ApiOperation({ summary: 'Listar inventários cíclicos com paginação' })
  @ApiOkResponse({ type: PaginatedCycleCountsResponseDto })
  @ApiNotFoundResponse({ description: 'Feature de inventário cíclico desabilitada' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListCycleCountsQueryDto) {
    this.features.assertEnabled(InventoryAdvancedFeature.CYCLE_COUNTS);
    return this.inventoryService.listCycleCounts(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar detalhe de inventário cíclico' })
  @ApiOkResponse({ type: CycleCountMutationResponseDto })
  @ApiNotFoundResponse({ description: 'Feature desabilitada ou inventário inexistente' })
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.features.assertEnabled(InventoryAdvancedFeature.CYCLE_COUNTS);
    const cycleCount = await this.inventoryService.getCycleCount(id, user.tenantId);
    return { cycleCount };
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Abrir inventário cíclico e capturar snapshot de saldo' })
  @ApiOkResponse({ type: CycleCountMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Inventário não pode ser aberto' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada ou inventário inexistente' })
  async open(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.features.assertEnabled(InventoryAdvancedFeature.CYCLE_COUNTS);
    const cycleCount = await this.inventoryService.openCycleCount(id, user.tenantId, user.id);
    return { cycleCount };
  }

  @Put(':id/items/:itemId/count')
  @ApiOperation({ summary: 'Registrar quantidade física contada para um item' })
  @ApiOkResponse({ type: CycleCountMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Inventário não está aberto ou quantidade inválida' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada, inventário ou item inexistente' })
  async countItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: CountCycleCountItemDto,
  ) {
    this.features.assertEnabled(InventoryAdvancedFeature.CYCLE_COUNTS);
    const cycleCount = await this.inventoryService.countCycleCountItem(
      id,
      itemId,
      user.tenantId,
      user.id,
      dto,
    );
    return { cycleCount };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprovar inventário cíclico e gerar ajustes atômicos' })
  @ApiOkResponse({ type: CycleCountApprovalResponseDto })
  @ApiBadRequestResponse({ description: 'Inventário não contado ou ajuste inválido' })
  @ApiConflictResponse({ description: 'Saldo mudou desde o snapshot do inventário' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada ou inventário inexistente' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveCycleCountDto,
  ) {
    this.features.assertEnabled(InventoryAdvancedFeature.CYCLE_COUNTS);
    return this.inventoryService.approveCycleCount(id, user.tenantId, user.id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar inventário cíclico não aprovado' })
  @ApiOkResponse({ type: CycleCountMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Inventário aprovado não pode ser cancelado' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada ou inventário inexistente' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelCycleCountDto,
  ) {
    this.features.assertEnabled(InventoryAdvancedFeature.CYCLE_COUNTS);
    const cycleCount = await this.inventoryService.cancelCycleCount(
      id,
      user.tenantId,
      user.id,
      dto,
    );
    return { cycleCount };
  }
}
