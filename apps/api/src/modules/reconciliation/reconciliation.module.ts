import { Module } from '@nestjs/common';
import { ReconciliationFoundationController } from './presentation/controllers/reconciliation-foundation.controller';

@Module({
  controllers: [ReconciliationFoundationController],
})
export class ReconciliationModule {}
