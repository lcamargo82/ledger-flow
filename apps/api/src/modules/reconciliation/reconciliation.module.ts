import { Module, OnModuleInit } from '@nestjs/common';
import { AsyncModule } from '../async/async.module';
import { AsyncHandlerRegistryService } from '../async/application/services/async-handler-registry.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { ReconciliationSettlementReceivedAsyncHandler } from './application/async-handlers/reconciliation-settlement-received.handler';
import { ReconciliationSettlementIngestionService } from './application/services/reconciliation-settlement-ingestion.service';
import { AsaasReconciliationProviderAdapter } from './infra/adapters/asaas-reconciliation-provider.adapter';
import { ReconciliationFoundationController } from './presentation/controllers/reconciliation-foundation.controller';

@Module({
  imports: [PrismaModule, AsyncModule],
  controllers: [ReconciliationFoundationController],
  providers: [
    AsaasReconciliationProviderAdapter,
    ReconciliationSettlementIngestionService,
    ReconciliationSettlementReceivedAsyncHandler,
  ],
  exports: [ReconciliationSettlementIngestionService],
})
export class ReconciliationModule implements OnModuleInit {
  constructor(
    private readonly asyncHandlerRegistry: AsyncHandlerRegistryService,
    private readonly settlementReceivedHandler: ReconciliationSettlementReceivedAsyncHandler,
  ) {}

  onModuleInit() {
    this.asyncHandlerRegistry.register(this.settlementReceivedHandler);
  }
}
