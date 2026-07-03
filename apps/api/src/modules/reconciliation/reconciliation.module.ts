import { Module, OnModuleInit } from '@nestjs/common';
import { AsyncModule } from '../async/async.module';
import { AsyncHandlerRegistryService } from '../async/application/services/async-handler-registry.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { ReconciliationSettlementReceivedAsyncHandler } from './application/async-handlers/reconciliation-settlement-received.handler';
import { ReconciliationCasesService } from './application/services/reconciliation-cases.service';
import { ReconciliationDecisionsService } from './application/services/reconciliation-decisions.service';
import { ReconciliationDashboardService } from './application/services/reconciliation-dashboard.service';
import { ReconciliationMatchingService } from './application/services/reconciliation-matching.service';
import { ReconciliationPoliciesService } from './application/services/reconciliation-policies.service';
import { ReconciliationSettlementIngestionService } from './application/services/reconciliation-settlement-ingestion.service';
import { ReconciliationSyncService } from './application/services/reconciliation-sync.service';
import { AsaasReconciliationProviderAdapter } from './infra/adapters/asaas-reconciliation-provider.adapter';
import { ReconciliationCasesController } from './presentation/controllers/reconciliation-cases.controller';
import { ReconciliationDashboardController } from './presentation/controllers/reconciliation-dashboard.controller';
import { ReconciliationFoundationController } from './presentation/controllers/reconciliation-foundation.controller';
import { ReconciliationPoliciesController } from './presentation/controllers/reconciliation-policies.controller';
import { ReconciliationSyncController } from './presentation/controllers/reconciliation-sync.controller';

@Module({
  imports: [PrismaModule, AsyncModule],
  controllers: [
    ReconciliationFoundationController,
    ReconciliationCasesController,
    ReconciliationDashboardController,
    ReconciliationPoliciesController,
    ReconciliationSyncController,
  ],
  providers: [
    AsaasReconciliationProviderAdapter,
    ReconciliationCasesService,
    ReconciliationDashboardService,
    ReconciliationDecisionsService,
    ReconciliationMatchingService,
    ReconciliationPoliciesService,
    ReconciliationSettlementIngestionService,
    ReconciliationSyncService,
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
