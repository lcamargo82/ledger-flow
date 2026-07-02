import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class ProductSkuInputDto {
  @ApiProperty({ example: 'SKU_1234' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 25.5, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  averageCost: number;

  @ApiProperty({ example: 'UN', default: 'UN' })
  @IsString()
  @Length(1, 12)
  unitOfMeasure: string;

  @ApiProperty({ example: 'BRL', default: 'BRL' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiPropertyOptional({ example: '7891234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;
}
