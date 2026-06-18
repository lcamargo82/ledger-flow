import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateCustomerStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  @IsNotEmpty()
  active: boolean;
}
