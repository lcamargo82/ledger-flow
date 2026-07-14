import { OmitType } from '@nestjs/swagger';
import { ListSalesIntelligenceQueryDto } from './list-sales-intelligence-query.dto';

export class CreateSalesIntelligenceExportDto extends OmitType(ListSalesIntelligenceQueryDto, [
  'page',
  'perPage',
] as const) {}
