import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { FinancialIntelligenceService } from './application/services/financial-intelligence.service';
import { FinancialIntelligenceFoundationController } from './presentation/controllers/financial-intelligence-foundation.controller';
import { FinancialIntelligenceController } from './presentation/controllers/financial-intelligence.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FinancialIntelligenceFoundationController, FinancialIntelligenceController],
  providers: [FinancialIntelligenceService],
  exports: [FinancialIntelligenceService],
})
export class FinancialIntelligenceModule {}
