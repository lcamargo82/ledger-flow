import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { CatalogProductsService } from './application/services/catalog-products.service';
import { CATALOG_PRODUCTS_REPOSITORY } from './domain/repositories/catalog-products.repository';
import { PrismaCatalogProductsRepository } from './infra/repositories/prisma-catalog-products.repository';
import { CatalogFoundationController } from './presentation/controllers/catalog-foundation.controller';
import { CatalogProductsController } from './presentation/controllers/catalog-products.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogFoundationController, CatalogProductsController],
  providers: [
    CatalogProductsService,
    {
      provide: CATALOG_PRODUCTS_REPOSITORY,
      useClass: PrismaCatalogProductsRepository,
    },
  ],
})
export class CatalogModule {}
