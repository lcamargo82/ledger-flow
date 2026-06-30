import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { SubscriptionPlan, TenantSubscriptionStatus } from '@prisma/client';

export class CreateTenantOrganizationDto {
  @ApiProperty({ example: 'Empresa Exemplo Ltda' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'empresa-exemplo' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  @IsString()
  @IsNotEmpty()
  timezone: string;
}

export class CreateTenantOwnerDto {
  @ApiProperty({ example: 'Administrador da Empresa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin@empresaexemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CreateTenantSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PROFESSIONAL,
  })
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  plan: SubscriptionPlan;

  @ApiProperty({
    enum: TenantSubscriptionStatus,
    example: TenantSubscriptionStatus.TRIAL,
  })
  @IsEnum(TenantSubscriptionStatus)
  @IsNotEmpty()
  status: TenantSubscriptionStatus;

  @ApiPropertyOptional({ example: '2026-07-30T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  currentPeriodStart?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  currentPeriodEnd?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePlatformTenantDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateTenantOrganizationDto)
  organization: CreateTenantOrganizationDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateTenantOwnerDto)
  owner: CreateTenantOwnerDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateTenantSubscriptionDto)
  subscription: CreateTenantSubscriptionDto;
}
