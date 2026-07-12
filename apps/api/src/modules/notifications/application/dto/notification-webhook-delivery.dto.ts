import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationWebhookDeliveryStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNotificationWebhookDeliveriesQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take = 20;
}

export class NotificationWebhookDeliveryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: NotificationWebhookDeliveryStatus })
  status: NotificationWebhookDeliveryStatus;
  @ApiProperty() attemptCount: number;
  @ApiProperty() maxAttempts: number;
  @ApiProperty({ nullable: true }) nextAttemptAt: Date | null;
  @ApiProperty({ nullable: true }) lastAttemptAt: Date | null;
  @ApiProperty({ nullable: true }) deliveredAt: Date | null;
  @ApiProperty({ nullable: true }) responseStatusCode: number | null;
  @ApiProperty({ nullable: true }) errorCode: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class NotificationWebhookDeliveryMutationResponseDto {
  @ApiProperty({ type: NotificationWebhookDeliveryResponseDto })
  delivery: NotificationWebhookDeliveryResponseDto;
}

export class NotificationWebhookDeliveryListResponseDto {
  @ApiProperty({
    example: { PENDING: 0, PROCESSING: 0, DELIVERED: 8, RETRY_SCHEDULED: 1, DLQ: 1, CANCELED: 0 },
  })
  counts: Record<NotificationWebhookDeliveryStatus, number>;

  @ApiProperty({ type: [NotificationWebhookDeliveryResponseDto] })
  data: NotificationWebhookDeliveryResponseDto[];
}
