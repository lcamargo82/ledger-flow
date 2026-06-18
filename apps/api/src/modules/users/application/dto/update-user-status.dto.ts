import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: false,
    description: 'Whether the user should be active or inactive',
  })
  @IsBoolean()
  active: boolean;
}
