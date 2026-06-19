import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'E-mail do usuário para recuperação de senha',
    example: 'owner@ledgerflow.local',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
