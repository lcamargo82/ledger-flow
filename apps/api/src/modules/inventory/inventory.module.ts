import { Module } from '@nestjs/common';
import { InventoryFoundationController } from './presentation/controllers/inventory-foundation.controller';

@Module({
  controllers: [InventoryFoundationController],
})
export class InventoryModule {}
