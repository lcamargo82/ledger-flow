import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditSeverity, AuditActorType } from '@prisma/client';

export class PlatformAuditTenantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}

export class PlatformAuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ type: () => PlatformAuditTenantResponseDto })
  tenant?: PlatformAuditTenantResponseDto;

  @ApiProperty()
  action: string;

  @ApiPropertyOptional({ enum: AuditSeverity })
  severity?: AuditSeverity;

  @ApiPropertyOptional({ enum: AuditActorType })
  actorType?: AuditActorType;

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  entityType?: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiProperty()
  occurredAt: Date;
}
