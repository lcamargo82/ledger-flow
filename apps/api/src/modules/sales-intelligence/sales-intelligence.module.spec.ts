import { SalesIntelligenceService } from './application/services/sales-intelligence.service';
import { SalesIntelligenceModule } from './sales-intelligence.module';

describe('SalesIntelligenceModule', () => {
  it('declares the sales intelligence service as a provider', () => {
    const providers = Reflect.getMetadata('providers', SalesIntelligenceModule) as unknown[];
    expect(providers).toContain(SalesIntelligenceService);
  });
});
