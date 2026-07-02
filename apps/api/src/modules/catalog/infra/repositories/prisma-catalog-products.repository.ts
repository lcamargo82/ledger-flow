import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CatalogProductsRepository,
  ListProductsParams,
  PaginatedProductsResult,
  ProductCreateData,
  ProductUpdateData,
  ProductWithSku,
} from '../../domain/repositories/catalog-products.repository';

@Injectable()
export class PrismaCatalogProductsRepository implements CatalogProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(params: ListProductsParams): Promise<PaginatedProductsResult> {
    const { tenantId, page = 1, perPage = 10, search, type, status } = params;
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const where: Prisma.ProductWhereInput = { tenantId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { sku: { skuCanonical: { contains: search.toUpperCase(), mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { sku: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<ProductWithSku | null> {
    return this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { sku: true },
    });
  }

  async findSkuByCanonicalAndTenant(skuCanonical: string, tenantId: string) {
    return this.prisma.productSku.findUnique({
      where: { tenantId_skuCanonical: { tenantId, skuCanonical } },
    });
  }

  async create(data: ProductCreateData): Promise<ProductWithSku> {
    return this.prisma.product.create({
      data: {
        tenantId: data.tenantId,
        type: data.type,
        parentProductId: data.parentProductId,
        name: data.name,
        description: data.description,
        brand: data.brand,
        category: data.category,
        attributes: data.attributes as Prisma.InputJsonValue,
        sku: data.sku
          ? {
              create: {
                tenantId: data.tenantId,
                skuCanonical: data.sku.skuCanonical,
                skuDisplay: data.sku.skuDisplay,
                averageCost: data.sku.averageCost,
                unitOfMeasure: data.sku.unitOfMeasure,
                currency: data.sku.currency,
                barcode: data.sku.barcode,
              },
            }
          : undefined,
      },
      include: { sku: true },
    });
  }

  async update(id: string, tenantId: string, data: ProductUpdateData): Promise<ProductWithSku> {
    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        brand: data.brand,
        category: data.category,
        attributes: data.attributes as Prisma.InputJsonValue,
        sku: data.sku
          ? {
              update: {
                averageCost: data.sku.averageCost,
                unitOfMeasure: data.sku.unitOfMeasure,
                currency: data.sku.currency,
                barcode: data.sku.barcode,
              },
            }
          : undefined,
      },
      include: { sku: true },
    });
  }

  async archive(id: string, tenantId: string): Promise<ProductWithSku> {
    return this.prisma.product.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
      include: { sku: true },
    });
  }
}
