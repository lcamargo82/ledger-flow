import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class UpdateSalesIntelligencePolicyDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  lowMarginEnabled!: boolean;

  @ApiProperty({ example: 10, minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  lowMarginThreshold!: number;
}

export class SalesIntelligencePolicyDto {
  @ApiProperty({ example: true })
  lowMarginEnabled!: boolean;

  @ApiProperty({ example: '10.00' })
  lowMarginThreshold!: string;
}
