import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus, ProductType } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { SkuPolicy } from '../../domain/policies/sku-policy';
import {
  CATALOG_PRODUCTS_REPOSITORY,
} from '../../domain/repositories/catalog-products.repository';
import type {
  CatalogProductsRepository,
  ProductSkuCreateData,
} from '../../domain/repositories/catalog-products.repository';

@Injectable()
export class CatalogProductsService {
  constructor(
    @Inject(CATALOG_PRODUCTS_REPOSITORY)
    private readonly productsRepository: CatalogProductsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    tenantId: string,
    actorUserId: string,
    createProductDto: CreateProductDto,
  ) {
    await this.validateProductShape(tenantId, createProductDto);

    const sku = createProductDto.sku
      ? await this.buildSkuCreateData(tenantId, createProductDto.sku)
      : undefined;

    const product = await this.productsRepository.create({
      tenantId,
      type: createProductDto.type,
      parentProductId: createProductDto.parentProductId ?? null,
      name: createProductDto.name,
      description: createProductDto.description ?? null,
      brand: createProductDto.brand ?? null,
      category: createProductDto.category ?? null,
      attributes: createProductDto.attributes ?? null,
      sku,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      'catalog.product.created',
      product.id,
    );

    return product;
  }

  findAll(tenantId: string, query: ListProductsQueryDto) {
    return this.productsRepository.findPaginated({
      tenantId,
      page: query.page,
      perPage: query.perPage,
      search: query.search,
      type: query.type,
      status: query.status,
    });
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.productsRepository.findByIdAndTenant(
      id,
      tenantId,
    );
    if (!product) {
      throw new NotFoundException('Product not found.');
    }
    return product;
  }

  async update(
    id: string,
    tenantId: string,
    actorUserId: string,
    updateProductDto: UpdateProductDto,
  ) {
    const product = await this.findOne(id, tenantId);

    if (product.status === ProductStatus.ARCHIVED) {
      throw new BadRequestException('Archived products cannot be updated.');
    }

    let skuUpdate: Partial<ProductSkuCreateData> | undefined;

    if (updateProductDto.sku) {
      if (!product.sku) {
        throw new BadRequestException('Product does not have a SKU.');
      }

      const nextSkuCanonical = SkuPolicy.normalize(updateProductDto.sku.sku);
      if (nextSkuCanonical !== product.sku.skuCanonical) {
        throw new BadRequestException(
          'SKU changes require an explicit audited flow.',
        );
      }

      const nextAverageCost = updateProductDto.sku.averageCost;
      const currentAverageCost = Number(product.sku.averageCost);
      if (
        nextAverageCost !== currentAverageCost &&
        !updateProductDto.costChangeReason
      ) {
        throw new BadRequestException('Cost change reason is required.');
      }

      skuUpdate = {
        averageCost: updateProductDto.sku.averageCost,
        unitOfMeasure: updateProductDto.sku.unitOfMeasure,
        currency: updateProductDto.sku.currency,
        barcode: updateProductDto.sku.barcode ?? null,
      };
    }

    const updatedProduct = await this.productsRepository.update(id, tenantId, {
      name: updateProductDto.name,
      description: updateProductDto.description,
      brand: updateProductDto.brand,
      category: updateProductDto.category,
      attributes: updateProductDto.attributes,
      sku: skuUpdate,
    });

    await this.auditLog(
      tenantId,
      actorUserId,
      updateProductDto.costChangeReason
        ? 'catalog.product.cost_updated'
        : 'catalog.product.updated',
      updatedProduct.id,
      updateProductDto.costChangeReason
        ? { reason: updateProductDto.costChangeReason }
        : undefined,
    );

    return updatedProduct;
  }

  async archive(id: string, tenantId: string, actorUserId: string) {
    const product = await this.findOne(id, tenantId);

    if (product.status === ProductStatus.ARCHIVED) {
      return product;
    }

    const archivedProduct = await this.productsRepository.archive(id, tenantId);

    await this.auditLog(
      tenantId,
      actorUserId,
      'catalog.product.archived',
      archivedProduct.id,
    );

    return archivedProduct;
  }

  private async validateProductShape(
    tenantId: string,
    dto: CreateProductDto,
  ): Promise<void> {
    if (dto.type === ProductType.PARENT && dto.sku) {
      throw new BadRequestException('Parent products cannot have SKU.');
    }

    if (
      (dto.type === ProductType.SIMPLE || dto.type === ProductType.VARIANT) &&
      !dto.sku
    ) {
      throw new BadRequestException('Sellable products require SKU.');
    }

    if (dto.type === ProductType.SIMPLE && dto.parentProductId) {
      throw new BadRequestException('Simple products cannot have parent.');
    }

    if (dto.type === ProductType.VARIANT) {
      if (!dto.parentProductId) {
        throw new BadRequestException('Variant products require parent.');
      }

      const parent = await this.productsRepository.findByIdAndTenant(
        dto.parentProductId,
        tenantId,
      );
      if (!parent || parent.type !== ProductType.PARENT) {
        throw new BadRequestException('Variant parent must be a parent product.');
      }
    }
  }

  private async buildSkuCreateData(
    tenantId: string,
    skuInput: NonNullable<CreateProductDto['sku']>,
  ): Promise<ProductSkuCreateData> {
    const skuCanonical = SkuPolicy.normalize(skuInput.sku);
    const existingSku =
      await this.productsRepository.findSkuByCanonicalAndTenant(
        skuCanonical,
        tenantId,
      );

    if (existingSku) {
      throw new ConflictException('SKU already exists for this tenant.');
    }

    return {
      skuCanonical,
      skuDisplay: skuCanonical,
      averageCost: skuInput.averageCost,
      unitOfMeasure: skuInput.unitOfMeasure,
      currency: skuInput.currency,
      barcode: skuInput.barcode ?? null,
    };
  }

  private async auditLog(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'Product',
        entityId,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }
}
