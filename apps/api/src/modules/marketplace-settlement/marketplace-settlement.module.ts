import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { MarketplaceFinancialIngestionService } from './application/services/marketplace-financial-ingestion.service';
import { MarketplaceFinancialAccountsService } from './application/services/marketplace-financial-accounts.service';
import { MercadoPagoFinancialReadService } from './application/services/mercado-pago-financial-read.service';
import { MarketplaceFinancialIngestionController } from './presentation/controllers/marketplace-financial-ingestion.controller';
import { MarketplaceFinancialAccountsController } from './presentation/controllers/marketplace-financial-accounts.controller';

@Module({
  imports: [PrismaModule, GatewaysModule, ReconciliationModule],
  controllers: [MarketplaceFinancialAccountsController, MarketplaceFinancialIngestionController],
  providers: [
    MarketplaceFinancialAccountsService,
    MarketplaceFinancialIngestionService,
    MercadoPagoFinancialReadService,
  ],
  exports: [MarketplaceFinancialAccountsService, MarketplaceFinancialIngestionService],
})
export class MarketplaceSettlementModule {}
