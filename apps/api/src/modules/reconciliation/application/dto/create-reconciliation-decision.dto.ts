import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReconciliationDecisionAction } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateReconciliationDecisionDto {
  @ApiProperty({ enum: ReconciliationDecisionAction })
  @IsEnum(ReconciliationDecisionAction)
  action: ReconciliationDecisionAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  paymentId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  reasonCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
