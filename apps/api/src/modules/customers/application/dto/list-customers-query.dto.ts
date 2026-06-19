import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum CustomerStatusQuery {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ALL = 'all',
}

export enum CustomerTypeQuery {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
  ALL = 'all',
}

export class ListCustomersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perPage?: number = 10;

  @ApiPropertyOptional({ example: 'João' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CustomerStatusQuery,
    default: CustomerStatusQuery.ALL,
  })
  @IsOptional()
  @IsEnum(CustomerStatusQuery)
  status?: CustomerStatusQuery = CustomerStatusQuery.ALL;

  @ApiPropertyOptional({
    enum: CustomerTypeQuery,
    default: CustomerTypeQuery.ALL,
  })
  @IsOptional()
  @IsEnum(CustomerTypeQuery)
  type?: CustomerTypeQuery = CustomerTypeQuery.ALL;
}
