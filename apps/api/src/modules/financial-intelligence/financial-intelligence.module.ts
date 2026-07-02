import { Module } from '@nestjs/common';
import { FinancialIntelligenceFoundationController } from './presentation/controllers/financial-intelligence-foundation.controller';

@Module({
  controllers: [FinancialIntelligenceFoundationController],
})
export class FinancialIntelligenceModule {}
