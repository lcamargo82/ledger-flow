import { Module } from '@nestjs/common';
import { CatalogFoundationController } from './presentation/controllers/catalog-foundation.controller';

@Module({
  controllers: [CatalogFoundationController],
})
export class CatalogModule {}
