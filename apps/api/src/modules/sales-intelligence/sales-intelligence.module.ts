import { Module } from '@nestjs/common';
import { SalesIntelligenceService } from './application/services/sales-intelligence.service';
import { SalesIntelligenceController } from './presentation/controllers/sales-intelligence.controller';

@Module({
  controllers: [SalesIntelligenceController],
  providers: [SalesIntelligenceService],
})
export class SalesIntelligenceModule {}
