import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SalesIntelligenceService } from './application/services/sales-intelligence.service';
import { SalesIntelligenceModule } from './sales-intelligence.module';

describe('SalesIntelligenceModule', () => {
  it('boots with only its declared runtime dependencies', async () => {
    const module = await Test.createTestingModule({
      imports: [SalesIntelligenceModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(module.get(SalesIntelligenceService)).toBeInstanceOf(
      SalesIntelligenceService,
    );
  });
});
