import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersService } from './application/services/orders.service';
import { ORDERS_REPOSITORY } from './domain/repositories/orders.repository';
import { PrismaOrdersRepository } from './infra/repositories/prisma-orders.repository';
import { OrdersController } from './presentation/controllers/orders.controller';
import { OrdersFoundationController } from './presentation/controllers/orders-foundation.controller';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [OrdersFoundationController, OrdersController],
  providers: [
    OrdersService,
    {
      provide: ORDERS_REPOSITORY,
      useClass: PrismaOrdersRepository,
    },
  ],
})
export class OrdersModule {}
