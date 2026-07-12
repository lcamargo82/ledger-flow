import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
import { CreateInventoryTransferDto } from '../../application/dto/create-inventory-transfer.dto';
import {
  InventoryTransferCompletionResponseDto,
  InventoryTransferMutationResponseDto,
  PaginatedTransfersResponseDto,
} from '../../application/dto/inventory-response.dto';
import {
  CancelInventoryTransferDto,
  CompleteInventoryTransferDto,
} from '../../application/dto/inventory-transfer-transition.dto';
import { ListInventoryTransfersQueryDto } from '../../application/dto/list-inventory-transfers-query.dto';
import { UpdateInventoryTransferDto } from '../../application/dto/update-inventory-transfer.dto';
import {
  InventoryAdvancedFeature,
  InventoryAdvancedFeatureService,
} from '../../application/services/inventory-advanced-feature.service';
import { InventoryService } from '../../application/services/inventory.service';

@ApiTags('Inventory Transfers')
@ApiBearerAuth('access-token')
@Controller('inventory/transfers')
@RequirePermissions('inventory:transfer')
@RequireCapabilities(InventoryAdvancedCapabilities.Transfer)
export class InventoryTransfersController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly features: InventoryAdvancedFeatureService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar rascunho de transferencia entre warehouses' })
  @ApiCreatedResponse({ type: InventoryTransferMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Transferencia invalida' })
  @ApiConflictResponse({ description: 'Idempotencia inconsistente' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada, warehouse ou SKU inexistente' })
  @ApiUnauthorizedResponse({ description: 'Nao autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissao ou capability de transferencia' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryTransferDto) {
    this.features.assertEnabled(InventoryAdvancedFeature.TRANSFERS);
    const transfer = await this.inventoryService.createTransfer(user.tenantId, user.id, dto);
    return { transfer };
  }

  @Get()
  @ApiOperation({ summary: 'Listar transferencias de estoque com paginacao' })
  @ApiOkResponse({ type: PaginatedTransfersResponseDto })
  @ApiNotFoundResponse({ description: 'Feature de transferencias desabilitada' })
  @ApiUnauthorizedResponse({ description: 'Nao autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissao ou capability de transferencia' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInventoryTransfersQueryDto) {
    this.features.assertEnabled(InventoryAdvancedFeature.TRANSFERS);
    return this.inventoryService.listTransfers(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar detalhe de transferencia de estoque' })
  @ApiOkResponse({ type: InventoryTransferMutationResponseDto })
  @ApiNotFoundResponse({ description: 'Feature desabilitada ou transferencia inexistente' })
  @ApiUnauthorizedResponse({ description: 'Nao autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissao ou capability de transferencia' })
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.features.assertEnabled(InventoryAdvancedFeature.TRANSFERS);
    const transfer = await this.inventoryService.getTransfer(id, user.tenantId);
    return { transfer };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar rascunho de transferencia' })
  @ApiOkResponse({ type: InventoryTransferMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Transferencia nao esta em rascunho ou dados invalidos' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada, transferencia ou SKU inexistente' })
  @ApiUnauthorizedResponse({ description: 'Nao autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissao ou capability de transferencia' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryTransferDto,
  ) {
    this.features.assertEnabled(InventoryAdvancedFeature.TRANSFERS);
    const transfer = await this.inventoryService.updateTransferDraft(
      id,
      user.tenantId,
      user.id,
      dto,
    );
    return { transfer };
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Iniciar transferencia em rascunho' })
  @ApiOkResponse({ type: InventoryTransferMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Transferencia nao pode ser iniciada' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada ou transferencia inexistente' })
  @ApiUnauthorizedResponse({ description: 'Nao autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissao ou capability de transferencia' })
  async start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.features.assertEnabled(InventoryAdvancedFeature.TRANSFERS);
    const transfer = await this.inventoryService.startTransfer(id, user.tenantId, user.id);
    return { transfer };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Concluir transferencia e gerar movimentos atomicos no ledger' })
  @ApiOkResponse({ type: InventoryTransferCompletionResponseDto })
  @ApiBadRequestResponse({ description: 'Saldo insuficiente ou transferencia em estado invalido' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada ou transferencia inexistente' })
  @ApiUnauthorizedResponse({ description: 'Nao autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissao ou capability de transferencia' })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteInventoryTransferDto,
  ) {
    this.features.assertEnabled(InventoryAdvancedFeature.TRANSFERS);
    return this.inventoryService.completeTransfer(id, user.tenantId, user.id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar transferencia ainda nao concluida' })
  @ApiOkResponse({ type: InventoryTransferMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Transferencia concluida nao pode ser cancelada' })
  @ApiNotFoundResponse({ description: 'Feature desabilitada ou transferencia inexistente' })
  @ApiUnauthorizedResponse({ description: 'Nao autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissao ou capability de transferencia' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelInventoryTransferDto,
  ) {
    this.features.assertEnabled(InventoryAdvancedFeature.TRANSFERS);
    const transfer = await this.inventoryService.cancelTransfer(id, user.tenantId, user.id, dto);
    return { transfer };
  }
}
