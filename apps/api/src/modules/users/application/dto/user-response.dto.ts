import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do usuário',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'ID do tenant',
  })
  tenantId: string;

  @ApiProperty({ example: 'Demo Owner', description: 'Nome do usuário' })
  name: string;

  @ApiProperty({
    example: 'owner@ledgerflow.local',
    description: 'E-mail do usuário',
  })
  email: string;

  @ApiProperty({
    example: true,
    description: 'Status do usuário (ativo/inativo)',
  })
  active: boolean;

  @ApiProperty({ example: ['OWNER'], description: 'Lista de roles do usuário' })
  roles: string[];

  @ApiProperty({
    example: '2026-06-14T20:28:21Z',
    description: 'Data do último login',
    required: false,
  })
  lastLoginAt: Date | null;

  @ApiProperty({
    example: '2026-06-01T10:00:00Z',
    description: 'Data de criação',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-06-05T12:30:00Z',
    description: 'Data de atualização',
  })
  updatedAt: Date;
}

export class UserDetailsResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
