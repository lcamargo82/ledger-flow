import { ApiProperty } from '@nestjs/swagger';
import { ReconciliationCaseStatus, WebhookProvider } from '@prisma/client';

export class ReconciliationDashboardKpisDto {
  @ApiProperty()
  expectedAmountMinor: string;

  @ApiProperty()
  reconciledAmountMinor: string;

  @ApiProperty()
  pendingAmountMinor: string;

  @ApiProperty()
  divergentAmountMinor: string;

  @ApiProperty()
  totalCases: number;

  @ApiProperty()
  reconciledCases: number;

  @ApiProperty()
  pendingCases: number;

  @ApiProperty()
  divergentCases: number;
}

export class ReconciliationDashboardStatusDto {
  @ApiProperty({ enum: ReconciliationCaseStatus })
  status: ReconciliationCaseStatus;

  @ApiProperty()
  count: number;

  @ApiProperty()
  amountMinor: string;
}

export class ReconciliationDashboardProviderDto {
  @ApiProperty({ enum: WebhookProvider })
  provider: WebhookProvider;

  @ApiProperty()
  count: number;

  @ApiProperty()
  expectedAmountMinor: string;

  @ApiProperty()
  receivedAmountMinor: string;
}

export class ReconciliationDashboardAgingBucketDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  amountMinor: string;
}

export class ReconciliationDashboardResponseDto {
  @ApiProperty({ type: ReconciliationDashboardKpisDto })
  kpis: ReconciliationDashboardKpisDto;

  @ApiProperty({ type: [ReconciliationDashboardStatusDto] })
  byStatus: ReconciliationDashboardStatusDto[];

  @ApiProperty({ type: [ReconciliationDashboardProviderDto] })
  byProvider: ReconciliationDashboardProviderDto[];

  @ApiProperty({ type: [ReconciliationDashboardAgingBucketDto] })
  agingBuckets: ReconciliationDashboardAgingBucketDto[];

  @ApiProperty()
  note: string;
}
