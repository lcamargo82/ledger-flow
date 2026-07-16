import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsInt,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class MockChannelListingDto {
  @ApiProperty({ example: 'mock-listing-001' })
  @IsString()
  @MaxLength(120)
  externalListingId: string;

  @ApiPropertyOptional({ example: 'MLBU4292355491' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalUserProductId?: string;

  @ApiProperty({ example: 'Camiseta LedgerFlow Azul' })
  @IsString()
  @MaxLength(180)
  title: string;

  @ApiPropertyOptional({ example: 'CAMISETA-AZUL-M' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  externalSku?: string;
}

export class ImportChannelListingsDto {
  @ApiPropertyOptional({
    example: 'MLBU4292355491',
    description: 'Importa somente os itens associados ao User Product informado.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalUserProductId?: string;

  @ApiPropertyOptional({
    type: [MockChannelListingDto],
    description: 'Payload opcional para simular retorno do provider MOCK.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MockChannelListingDto)
  listings?: MockChannelListingDto[];

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxPages?: number;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
