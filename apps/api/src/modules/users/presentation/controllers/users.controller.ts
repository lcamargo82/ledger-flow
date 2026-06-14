import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from '../../application/services/users.service';
import { ListUsersQueryDto } from '../../application/dto/list-users-query.dto';
import { PaginatedUsersResponseDto } from '../../application/dto/paginated-users-response.dto';
import { UserDetailsResponseDto } from '../../application/dto/user-response.dto';
import { CurrentUser } from '../../../../modules/auth/presentation/decorators/current-user.decorator';
import { RequirePermissions } from '../../../../modules/auth/presentation/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../../../../modules/auth/application/types/authenticated-user.type';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Listar usuários do tenant de forma paginada' })
  @ApiOkResponse({
    type: PaginatedUsersResponseDto,
    description: 'Retorna a lista paginada de usuários sanitizados',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Usuário não tem permissão de "users:read"' })
  async listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.usersService.listUsers(user.tenantId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Obter detalhes de um usuário específico do tenant' })
  @ApiOkResponse({
    type: UserDetailsResponseDto,
    description: 'Retorna os detalhes sanitizados do usuário',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Usuário não tem permissão de "users:read"' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado no tenant' })
  async getUserById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') userId: string,
  ): Promise<UserDetailsResponseDto> {
    const userDetails = await this.usersService.getUserById(user.tenantId, userId);
    return { user: userDetails };
  }
}
