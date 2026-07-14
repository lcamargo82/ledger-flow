import { Injectable } from '@nestjs/common';
import { ListSalesIntelligenceQueryDto } from '../dto/list-sales-intelligence-query.dto';

@Injectable()
export class SalesIntelligenceService {
  list(_tenantId: string, query: ListSalesIntelligenceQueryDto) {
    void _tenantId;

    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;

    return {
      data: [],
      meta: { page, perPage, total: 0, totalPages: 0 },
    };
  }

  getSummary(_tenantId: string) {
    void _tenantId;

    return {
      orderCount: 0,
      paidAmountMinor: '0',
      feeAmountMinor: '0',
      netAmountMinor: '0',
      realizedNetAmountMinor: '0',
      reconciledNetAmountMinor: '0',
      estimatedNetAmountMinor: '0',
      stockIssueCount: 0,
      currency: 'BRL',
    };
  }
}
