import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MockChannelListingDto {
  @ApiProperty({ example: 'mock-listing-001' })
  @IsString()
  @MaxLength(120)
  externalListingId: string;

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
    type: [MockChannelListingDto],
    description: 'Payload opcional para simular retorno do provider MOCK.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MockChannelListingDto)
  listings?: MockChannelListingDto[];
}
