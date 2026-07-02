import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'MAIN' })
  @IsString()
  @Length(2, 20)
  code: string;

  @ApiProperty({ example: 'Estoque Principal' })
  @IsString()
  @MinLength(2)
  name: string;
}
