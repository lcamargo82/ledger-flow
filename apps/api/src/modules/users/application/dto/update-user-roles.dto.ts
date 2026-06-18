import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class UpdateUserRolesDto {
  @ApiProperty({
    example: ['SUPPORT_VIEWER'],
    description: 'List of role keys to assign to the user',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  roleKeys: string[];
}
