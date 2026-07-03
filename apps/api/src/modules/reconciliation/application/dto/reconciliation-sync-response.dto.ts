import { ApiProperty } from '@nestjs/swagger';
import { WebhookProvider } from '@prisma/client';

export class ReconciliationSyncResponseDto {
  @ApiProperty({ enum: WebhookProvider, example: WebhookProvider.ASAAS })
  provider!: WebhookProvider;

  @ApiProperty({ example: 2 })
  pagesFetched!: number;

  @ApiProperty({ example: 150 })
  received!: number;

  @ApiProperty({ example: 140 })
  created!: number;

  @ApiProperty({ example: 10 })
  duplicates!: number;

  @ApiProperty({ example: false })
  circuitOpened!: boolean;

  @ApiProperty({
    example: '2026-07-03T18:30:00.000Z',
    nullable: true,
    type: String,
  })
  nextAttemptAt!: Date | null;
}
