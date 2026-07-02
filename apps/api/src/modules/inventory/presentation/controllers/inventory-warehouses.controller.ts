import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
import { CreateWarehouseDto } from '../../application/dto/create-warehouse.dto';
import { InventoryService } from '../../application/services/inventory.service';
import { ListWarehousesQueryDto } from '../../application/dto/list-warehouses-query.dto';
import { UpdateWarehouseDto } from '../../application/dto/update-warehouse.dto';
import {
  PaginatedWarehousesResponseDto,
  WarehouseMutationResponseDto,
} from '../../application/dto/inventory-response.dto';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('inventory/warehouses')
@RequireCapabilities(CommerceCapabilities.InventoryManage)
export class InventoryWarehousesController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Criar warehouse' })
  @ApiCreatedResponse({ type: WarehouseMutationResponseDto })
  @ApiConflictResponse({ description: 'Código já cadastrado para este tenant' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventory' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWarehouseDto) {
    const warehouse = await this.inventoryService.createWarehouse(user.tenantId, user.id, dto);
    return { warehouse };
  }

  @Get()
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Listar warehouses com paginação' })
  @ApiOkResponse({ type: PaginatedWarehousesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventory' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListWarehousesQueryDto) {
    return this.inventoryService.listWarehouses(user.tenantId, query);
  }

  @Patch(':id')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Atualizar warehouse' })
  @ApiOkResponse({ type: WarehouseMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de inventory' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    const warehouse = await this.inventoryService.updateWarehouse(id, user.tenantId, user.id, dto);
    return { warehouse };
  }
}
