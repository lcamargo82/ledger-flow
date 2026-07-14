import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { SalesIntelligenceService } from './application/services/sales-intelligence.service';
import { SalesIntelligenceController } from './presentation/controllers/sales-intelligence.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SalesIntelligenceController],
  providers: [SalesIntelligenceService],
})
export class SalesIntelligenceModule {}
