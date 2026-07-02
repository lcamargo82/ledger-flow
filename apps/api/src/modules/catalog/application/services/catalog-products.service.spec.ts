import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductStatus, ProductType } from '@prisma/client';
import { CatalogProductsService } from './catalog-products.service';

describe('CatalogProductsService', () => {
  const repository = {
    findPaginated: jest.fn(),
    findByIdAndTenant: jest.fn(),
    findSkuByCanonicalAndTenant: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };

  const prisma = {
    auditLog: {
      create: jest.fn(),
    },
  };

  let service: CatalogProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CatalogProductsService(repository as never, prisma as never);
  });

  it('creates a simple product with normalized SKU and audit log', async () => {
    repository.findSkuByCanonicalAndTenant.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: 'product-1',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      sku: { skuCanonical: 'ABC_1234', averageCost: '12.34' },
    });

    const product = await service.create('tenant-1', 'user-1', {
      type: ProductType.SIMPLE,
      name: 'Produto simples',
      sku: {
        sku: 'abc_1234',
        averageCost: 12.34,
        unitOfMeasure: 'UN',
        currency: 'BRL',
      },
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        type: ProductType.SIMPLE,
        sku: expect.objectContaining({
          skuCanonical: 'ABC_1234',
          skuDisplay: 'ABC_1234',
          averageCost: 12.34,
          unitOfMeasure: 'UN',
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'catalog.product.created',
        entityType: 'Product',
        entityId: 'product-1',
      }),
    });
    expect(product.id).toBe('product-1');
  });

  it('rejects parent products with SKU data', async () => {
    await expect(
      service.create('tenant-1', 'user-1', {
        type: ProductType.PARENT,
        name: 'Produto pai',
        sku: {
          sku: 'PARENT01',
          averageCost: 1,
          unitOfMeasure: 'UN',
          currency: 'BRL',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate SKU inside the same tenant', async () => {
    repository.findSkuByCanonicalAndTenant.mockResolvedValue({ id: 'sku-1' });

    await expect(
      service.create('tenant-1', 'user-1', {
        type: ProductType.SIMPLE,
        name: 'Produto simples',
        sku: {
          sku: 'DUPL1234',
          averageCost: 1,
          unitOfMeasure: 'UN',
          currency: 'BRL',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('archives a product and writes audit log', async () => {
    repository.findByIdAndTenant.mockResolvedValue({
      id: 'product-1',
      status: ProductStatus.ACTIVE,
    });
    repository.archive.mockResolvedValue({
      id: 'product-1',
      status: ProductStatus.ARCHIVED,
    });

    await service.archive('product-1', 'tenant-1', 'user-1');

    expect(repository.archive).toHaveBeenCalledWith('product-1', 'tenant-1');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'catalog.product.archived',
        entityId: 'product-1',
      }),
    });
  });
});
