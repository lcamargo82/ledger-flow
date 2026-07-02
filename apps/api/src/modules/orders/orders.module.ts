import { Module } from '@nestjs/common';
import { OrdersFoundationController } from './presentation/controllers/orders-foundation.controller';

@Module({
  controllers: [OrdersFoundationController],
})
export class OrdersModule {}
