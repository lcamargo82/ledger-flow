import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { MarketplaceFinancialAccountsService } from './application/services/marketplace-financial-accounts.service';
import { MarketplaceFinancialAccountsController } from './presentation/controllers/marketplace-financial-accounts.controller';

@Module({
  imports: [PrismaModule, GatewaysModule],
  controllers: [MarketplaceFinancialAccountsController],
  providers: [MarketplaceFinancialAccountsService],
  exports: [MarketplaceFinancialAccountsService],
})
export class MarketplaceSettlementModule {}
