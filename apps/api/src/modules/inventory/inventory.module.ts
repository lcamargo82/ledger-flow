import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { ChannelsModule } from '../channels/channels.module';
import { InventoryService } from './application/services/inventory.service';
import { INVENTORY_REPOSITORY } from './domain/repositories/inventory.repository';
import { PrismaInventoryRepository } from './infra/repositories/prisma-inventory.repository';
import { InventoryFoundationController } from './presentation/controllers/inventory-foundation.controller';
import { InventoryLedgerController } from './presentation/controllers/inventory-ledger.controller';
import { InventoryWarehousesController } from './presentation/controllers/inventory-warehouses.controller';
import { InventoryAdvancedFoundationController } from './presentation/controllers/inventory-advanced-foundation.controller';
import { InventoryTransfersController } from './presentation/controllers/inventory-transfers.controller';
import { InventoryAdvancedFeatureService } from './application/services/inventory-advanced-feature.service';

@Module({
  imports: [PrismaModule, forwardRef(() => ChannelsModule)],
  controllers: [
    InventoryFoundationController,
    InventoryWarehousesController,
    InventoryLedgerController,
    InventoryAdvancedFoundationController,
    InventoryTransfersController,
  ],
  providers: [
    InventoryService,
    InventoryAdvancedFeatureService,
    {
      provide: INVENTORY_REPOSITORY,
      useClass: PrismaInventoryRepository,
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
