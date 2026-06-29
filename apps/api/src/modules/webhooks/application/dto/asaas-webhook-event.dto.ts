import { IsString, IsOptional, IsNumber, ValidateNested, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class AsaasWebhookPaymentDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  externalReference?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  billingType?: string;

  @IsNumber()
  @IsOptional()
  value?: number;
}

export class AsaasWebhookEventDto {
  @IsString()
  @IsDefined()
  id!: string;

  @IsString()
  @IsDefined()
  event!: string;

  @IsString()
  @IsOptional()
  dateCreated?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AsaasWebhookPaymentDto)
  payment?: AsaasWebhookPaymentDto;
}
