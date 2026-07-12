import { ApiPropertyOptional } from '@nestjs/swagger';
import { CycleCountStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListCycleCountsQueryDto {
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

  @ApiPropertyOptional({ enum: CycleCountStatus })
  @IsOptional()
  @IsEnum(CycleCountStatus)
  status?: CycleCountStatus;

  @ApiPropertyOptional({ example: 'warehouse-id' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}
