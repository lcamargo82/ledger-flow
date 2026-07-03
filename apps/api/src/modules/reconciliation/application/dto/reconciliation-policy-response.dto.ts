import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookProvider } from '@prisma/client';

export class ReconciliationPolicyResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ enum: WebhookProvider })
  provider?: WebhookProvider | null;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  currencyExponent: number;

  @ApiProperty()
  amountToleranceMinor: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
