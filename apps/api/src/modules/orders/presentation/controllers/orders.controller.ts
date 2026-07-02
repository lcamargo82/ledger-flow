import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { CreateOrderDto } from '../../application/dto/create-order.dto';
import { ListOrdersQueryDto } from '../../application/dto/list-orders-query.dto';
import { OrderTransitionDto } from '../../application/dto/order-transition.dto';
import {
  OrderMutationResponseDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
} from '../../application/dto/order-response.dto';
import { OrdersService } from '../../application/services/orders.service';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
@RequireCapabilities(CommerceCapabilities.OrdersManage)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequirePermissions('orders:manage')
  @ApiOperation({ summary: 'Criar pedido interno em rascunho' })
  @ApiCreatedResponse({ type: OrderMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Pedido inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de pedidos' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Listar pedidos internos com paginação' })
  @ApiOkResponse({ type: PaginatedOrdersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de pedidos' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.list(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Buscar pedido interno' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Pedido não encontrado' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de pedidos' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const order = await this.ordersService.findOne(id, user.tenantId);
    return { order };
  }

  @Post(':id/confirm')
  @RequirePermissions('orders:manage')
  @ApiOperation({ summary: 'Confirmar pedido interno e reservar estoque' })
  @ApiOkResponse({ type: OrderMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Pedido não pode ser confirmado' })
  @ApiNotFoundResponse({ description: 'Pedido não encontrado' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de pedidos' })
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: OrderTransitionDto,
  ) {
    return this.ordersService.confirm(id, user.tenantId, user.id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('orders:manage')
  @ApiOperation({ summary: 'Cancelar pedido interno e liberar reserva' })
  @ApiOkResponse({ type: OrderMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Pedido não pode ser cancelado' })
  @ApiNotFoundResponse({ description: 'Pedido não encontrado' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de pedidos' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: OrderTransitionDto,
  ) {
    return this.ordersService.cancel(id, user.tenantId, user.id, dto);
  }

  @Post(':id/fulfill')
  @RequirePermissions('orders:manage')
  @ApiOperation({ summary: 'Concluir pedido interno e consumir reserva' })
  @ApiOkResponse({ type: OrderMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Pedido não pode ser concluído' })
  @ApiNotFoundResponse({ description: 'Pedido não encontrado' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de pedidos' })
  fulfill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: OrderTransitionDto,
  ) {
    return this.ordersService.fulfill(id, user.tenantId, user.id, dto);
  }
}
