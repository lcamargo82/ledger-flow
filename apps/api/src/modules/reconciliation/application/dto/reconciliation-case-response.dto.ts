import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReconciliationCaseStatus, ReconciliationMatchType, WebhookProvider } from '@prisma/client';

export class ReconciliationCasePaymentSummaryDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  reference?: string | null;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  providerPaymentId?: string | null;
}

export class ReconciliationCaseSettlementSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  providerEventId: string;

  @ApiPropertyOptional()
  providerPaymentId?: string | null;

  @ApiPropertyOptional()
  externalReference?: string | null;

  @ApiPropertyOptional()
  occurredAt?: Date | null;
}

export class ReconciliationCaseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WebhookProvider })
  provider: WebhookProvider;

  @ApiProperty({ enum: ReconciliationCaseStatus })
  status: ReconciliationCaseStatus;

  @ApiProperty({ enum: ReconciliationMatchType })
  matchType: ReconciliationMatchType;

  @ApiPropertyOptional()
  expectedAmountMinor?: string | null;

  @ApiPropertyOptional()
  receivedAmountMinor?: string | null;

  @ApiPropertyOptional()
  differenceAmountMinor?: string | null;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  currencyExponent: number;

  @ApiProperty()
  policyVersion: number;

  @ApiPropertyOptional()
  matchedAt?: Date | null;

  @ApiPropertyOptional()
  reconciledAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: ReconciliationCaseSettlementSummaryDto })
  settlementEvent: ReconciliationCaseSettlementSummaryDto;

  @ApiPropertyOptional({ type: ReconciliationCasePaymentSummaryDto })
  payment?: ReconciliationCasePaymentSummaryDto | null;
}

export class PaginatedReconciliationCasesResponseDto {
  @ApiProperty({ type: [ReconciliationCaseResponseDto] })
  data: ReconciliationCaseResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      perPage: 20,
      total: 1,
      totalPages: 1,
    },
  })
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
