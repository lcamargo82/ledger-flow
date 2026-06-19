import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedUserResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do usuário',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'ID do tenant do usuário',
  })
  tenantId: string;

  @ApiProperty({ example: 'John Doe', description: 'Nome do usuário' })
  name: string;

  @ApiProperty({
    example: 'owner@ledgerflow.local',
    description: 'E-mail do usuário',
  })
  email: string;

  @ApiProperty({ example: ['admin'], description: 'Roles do usuário' })
  roles: string[];

  @ApiProperty({
    example: ['users:create', 'payments:read'],
    description: 'Permissões do usuário',
  })
  permissions: string[];

  @ApiProperty({
    example: 'sess_1234567890',
    description: 'ID da sessão ativa',
  })
  sessionId: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Access token (JWT) para as chamadas autenticadas',
  })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token opaco para renovar a sessão' })
  refreshToken: string;

  @ApiProperty({
    type: AuthenticatedUserResponseDto,
    description: 'Dados básicos do usuário logado',
  })
  user: AuthenticatedUserResponseDto;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'Novo access token (JWT)' })
  accessToken: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    example: 'Logged out successfully',
    description: 'Mensagem de sucesso',
  })
  message: string;
}

export class MeResponseDto {
  @ApiProperty({
    type: AuthenticatedUserResponseDto,
    description: 'Dados básicos do usuário autenticado',
  })
  user: AuthenticatedUserResponseDto;
}
