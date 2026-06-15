import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'ChangeMe123!',
    description: 'Temporary password, must be at least 8 characters long',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  temporaryPassword: string;

  @ApiProperty({
    example: ['SUPPORT_VIEWER'],
    description: 'List of role keys to assign to the user',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  roleKeys: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Initial active status of the user',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
