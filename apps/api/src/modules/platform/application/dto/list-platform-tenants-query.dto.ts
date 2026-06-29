import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantSubscriptionStatus, SubscriptionPlan } from '@prisma/client';

export class ListPlatformTenantsQueryDto {
  @ApiPropertyOptional({ description: 'Página atual' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 10;

  @ApiPropertyOptional({ description: 'Termo de busca (nome ou slug)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo/inativo' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por status da assinatura',
    enum: TenantSubscriptionStatus,
  })
  @IsOptional()
  @IsEnum(TenantSubscriptionStatus)
  subscriptionStatus?: TenantSubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por plano de assinatura',
    enum: SubscriptionPlan,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;
}
