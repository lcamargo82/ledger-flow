import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { CustomersService } from '../../application/services/customers.service';
import { CreateCustomerDto } from '../../application/dto/create-customer.dto';
import { UpdateCustomerDto } from '../../application/dto/update-customer.dto';
import { UpdateCustomerStatusDto } from '../../application/dto/update-customer-status.dto';
import { ListCustomersQueryDto } from '../../application/dto/list-customers-query.dto';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
} from '../../application/dto/customer-response.dto';

@ApiTags('Customers')
@ApiBearerAuth('access-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions('customers:create')
  @ApiOperation({ summary: 'Criar um novo cliente' })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão para customers:create' })
  @ApiConflictResponse({
    description: 'Email ou documento já cadastrado para este tenant',
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    return this.customersService.create(
      user.tenantId,
      user.id,
      createCustomerDto,
    );
  }

  @Get()
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Listar clientes com paginação e filtros' })
  @ApiOkResponse({ type: PaginatedCustomersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão para customers:read' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.customersService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Buscar detalhes de um cliente' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão para customers:read' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const customer = await this.customersService.findOne(id, user.tenantId);
    return { customer };
  }

  @Patch(':id')
  @RequirePermissions('customers:update')
  @ApiOperation({ summary: 'Atualizar um cliente' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão para customers:update' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({ description: 'Email ou documento já cadastrado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      id,
      user.tenantId,
      user.id,
      updateCustomerDto,
    );
  }

  @Patch(':id/status')
  @RequirePermissions('customers:update')
  @ApiOperation({ summary: 'Ativar ou desativar um cliente' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão para customers:update' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateCustomerStatusDto: UpdateCustomerStatusDto,
  ) {
    return this.customersService.updateStatus(
      id,
      user.tenantId,
      user.id,
      updateCustomerStatusDto.active,
    );
  }
}
