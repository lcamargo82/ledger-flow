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
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { CatalogProductsService } from '../../application/services/catalog-products.service';
import { CreateProductDto } from '../../application/dto/create-product.dto';
import { ListProductsQueryDto } from '../../application/dto/list-products-query.dto';
import { UpdateProductDto } from '../../application/dto/update-product.dto';
import {
  PaginatedProductsResponseDto,
  ProductMutationResponseDto,
  ProductResponseDto,
} from '../../application/dto/product-response.dto';

@ApiTags('Catalog')
@ApiBearerAuth('access-token')
@Controller('catalog/products')
@RequireCapabilities(CommerceCapabilities.CatalogManage)
export class CatalogProductsController {
  constructor(private readonly catalogProductsService: CatalogProductsService) {}

  @Post()
  @RequirePermissions('catalog:manage')
  @ApiOperation({ summary: 'Criar produto simples, pai ou variante' })
  @ApiCreatedResponse({ type: ProductMutationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de catálogo' })
  @ApiConflictResponse({ description: 'SKU já cadastrado para este tenant' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createProductDto: CreateProductDto,
  ) {
    const product = await this.catalogProductsService.create(
      user.tenantId,
      user.id,
      createProductDto,
    );
    return { product };
  }

  @Get()
  @RequirePermissions('catalog:read')
  @ApiOperation({ summary: 'Listar produtos com paginação e filtros' })
  @ApiOkResponse({ type: PaginatedProductsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de catálogo' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.catalogProductsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('catalog:read')
  @ApiOperation({ summary: 'Buscar detalhes de produto' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de catálogo' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const product = await this.catalogProductsService.findOne(id, user.tenantId);
    return { product };
  }

  @Patch(':id')
  @RequirePermissions('catalog:manage')
  @ApiOperation({ summary: 'Atualizar produto e dados editáveis do SKU' })
  @ApiOkResponse({ type: ProductMutationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de catálogo' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.catalogProductsService.update(
      id,
      user.tenantId,
      user.id,
      updateProductDto,
    );
    return { product };
  }

  @Post(':id/archive')
  @RequirePermissions('catalog:manage')
  @ApiOperation({ summary: 'Arquivar produto sem exclusão física' })
  @ApiOkResponse({ type: ProductMutationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de catálogo' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  async archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const product = await this.catalogProductsService.archive(
      id,
      user.tenantId,
      user.id,
    );
    return { product };
  }
}
