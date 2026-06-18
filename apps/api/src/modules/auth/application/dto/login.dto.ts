import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'owner@ledgerflow.local',
    description: 'E-mail do usuário',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'ChangeMe123!', description: 'Senha do usuário' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
