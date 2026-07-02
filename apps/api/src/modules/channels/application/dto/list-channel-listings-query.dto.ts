import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelListingMatchStatus, ChannelProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class ListChannelListingsQueryDto {
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

  @ApiPropertyOptional({ enum: ChannelProvider })
  @IsOptional()
  @IsEnum(ChannelProvider)
  provider?: ChannelProvider;

  @ApiPropertyOptional({ enum: ChannelListingMatchStatus })
  @IsOptional()
  @IsEnum(ChannelListingMatchStatus)
  status?: ChannelListingMatchStatus;
}
