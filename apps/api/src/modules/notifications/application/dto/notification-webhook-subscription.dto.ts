import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationWebhookSubscriptionStatus } from '@prisma/client';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNotificationWebhookSubscriptionDto {
  @ApiProperty({ example: 'ERP principal' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'https://erp.example.com/webhooks/ledgerflow' })
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  endpointUrl: string;

  @ApiProperty({
    type: [String],
    example: ['channel.inventory_sync.failed'],
    description: 'Tipos registrados no catálogo de eventos de notificações',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  eventTypes: string[];
}

export class UpdateNotificationWebhookSubscriptionDto {
  @ApiPropertyOptional({ example: 'ERP principal' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://erp.example.com/webhooks/ledgerflow' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  endpointUrl?: string;

  @ApiPropertyOptional({ type: [String], example: ['channel.inventory_sync.failed'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiPropertyOptional({ enum: NotificationWebhookSubscriptionStatus })
  @IsOptional()
  @IsEnum(NotificationWebhookSubscriptionStatus)
  status?: NotificationWebhookSubscriptionStatus;
}

export class NotificationWebhookSubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() endpointUrl: string;
  @ApiProperty({ enum: NotificationWebhookSubscriptionStatus })
  status: NotificationWebhookSubscriptionStatus;
  @ApiProperty({ type: [String] }) eventTypes: string[];
  @ApiProperty({ description: 'Trecho não sensível para identificar o segredo vigente' })
  secretFingerprintSuffix: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class NotificationWebhookSubscriptionListResponseDto {
  @ApiProperty({ type: [NotificationWebhookSubscriptionResponseDto] })
  data: NotificationWebhookSubscriptionResponseDto[];
}

export class NotificationWebhookSubscriptionMutationResponseDto {
  @ApiProperty({ type: NotificationWebhookSubscriptionResponseDto })
  subscription: NotificationWebhookSubscriptionResponseDto;
}

export class NotificationWebhookSecretIssuedResponseDto extends NotificationWebhookSubscriptionMutationResponseDto {
  @ApiProperty({ description: 'Exibido uma única vez; armazene-o com segurança' })
  secret: string;
}
