import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory, NotificationSeverity } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventType: string;

  @ApiProperty({ enum: NotificationCategory })
  category: NotificationCategory;

  @ApiProperty({ enum: NotificationSeverity })
  severity: NotificationSeverity;

  @ApiProperty()
  titleKey: string;

  @ApiProperty()
  messageKey: string;

  @ApiPropertyOptional({ type: Object })
  translationArgs?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  sourceId?: string | null;

  @ApiPropertyOptional()
  readAt?: Date | null;

  @ApiProperty()
  occurredAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationFeedResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty({ example: { nextCursor: null } })
  meta: { nextCursor: string | null };
}

export class NotificationUnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count: number;
}
