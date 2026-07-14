import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { SalesIntelligenceService } from './application/services/sales-intelligence.service';
import { SalesIntelligenceController } from './presentation/controllers/sales-intelligence.controller';
import { SalesIntelligencePolicyService } from './application/services/sales-intelligence-policy.service';
import { SalesIntelligencePolicyController } from './presentation/controllers/sales-intelligence-policy.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { SalesIntelligenceAlertService } from './application/services/sales-intelligence-alert.service';
import { AsyncModule } from '../async/async.module';
import { AsyncHandlerRegistryService } from '../async/application/services/async-handler-registry.service';
import {
  FinancialFactSalesAlertHandler,
  InventorySalesAlertHandler,
  SettlementSalesAlertHandler,
  ShippingSalesAlertHandler,
} from './application/async-handlers/sales-intelligence-alert.handlers';
import { ExportsModule } from '../exports/exports.module';
import { SalesIntelligenceExportsController } from './presentation/controllers/sales-intelligence-exports.controller';

@Module({
  imports: [PrismaModule, NotificationsModule, AsyncModule, ExportsModule],
  controllers: [
    SalesIntelligenceController,
    SalesIntelligencePolicyController,
    SalesIntelligenceExportsController,
  ],
  providers: [
    SalesIntelligenceService,
    SalesIntelligencePolicyService,
    SalesIntelligenceAlertService,
    FinancialFactSalesAlertHandler,
    InventorySalesAlertHandler,
    SettlementSalesAlertHandler,
    ShippingSalesAlertHandler,
  ],
})
export class SalesIntelligenceModule implements OnModuleInit {
  constructor(
    private readonly registry: AsyncHandlerRegistryService,
    private readonly financialHandler: FinancialFactSalesAlertHandler,
    private readonly inventoryHandler: InventorySalesAlertHandler,
    private readonly settlementHandler: SettlementSalesAlertHandler,
    private readonly shippingHandler: ShippingSalesAlertHandler,
  ) {}

  onModuleInit() {
    [
      this.financialHandler,
      this.inventoryHandler,
      this.settlementHandler,
      this.shippingHandler,
    ].forEach((handler) => this.registry.register(handler));
  }
}
