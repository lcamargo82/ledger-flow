import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { InventoryService } from './application/services/inventory.service';
import { INVENTORY_REPOSITORY } from './domain/repositories/inventory.repository';
import { PrismaInventoryRepository } from './infra/repositories/prisma-inventory.repository';
import { InventoryFoundationController } from './presentation/controllers/inventory-foundation.controller';
import { InventoryLedgerController } from './presentation/controllers/inventory-ledger.controller';
import { InventoryWarehousesController } from './presentation/controllers/inventory-warehouses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    InventoryFoundationController,
    InventoryWarehousesController,
    InventoryLedgerController,
  ],
  providers: [
    InventoryService,
    {
      provide: INVENTORY_REPOSITORY,
      useClass: PrismaInventoryRepository,
    },
  ],
})
export class InventoryModule {}
