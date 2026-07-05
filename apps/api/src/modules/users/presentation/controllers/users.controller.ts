import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from '../../application/services/users.service';
import { ListUsersQueryDto } from '../../application/dto/list-users-query.dto';
import { PaginatedUsersResponseDto } from '../../application/dto/paginated-users-response.dto';
import { UserDetailsResponseDto } from '../../application/dto/user-response.dto';
import { CreateUserDto } from '../../application/dto/create-user.dto';
import { UpdateUserDto } from '../../application/dto/update-user.dto';
import { UpdateUserStatusDto } from '../../application/dto/update-user-status.dto';
import { UpdateUserRolesDto } from '../../application/dto/update-user-roles.dto';
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
  @ApiForbiddenResponse({
    description: 'Usuário não tem permissão de "users:read"',
  })
  async listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.usersService.listUsers(user.tenantId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users:read')
  @ApiOperation({
    summary: 'Obter detalhes de um usuário específico do tenant',
  })
  @ApiOkResponse({
    type: UserDetailsResponseDto,
    description: 'Retorna os detalhes sanitizados do usuário',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Usuário não tem permissão de "users:read"',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado no tenant' })
  async getUserById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') userId: string,
  ): Promise<UserDetailsResponseDto> {
    const userDetails = await this.usersService.getUserById(user.tenantId, userId);
    return { user: userDetails };
  }

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Criar um novo usuário no tenant' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({
    type: UserDetailsResponseDto,
    description: 'Retorna o usuário criado',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Usuário não tem permissão de "users:create"',
  })
  @ApiConflictResponse({ description: 'Email já cadastrado no tenant' })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou roles inexistentes',
  })
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ): Promise<UserDetailsResponseDto> {
    const createdUser = await this.usersService.createUser(user, dto);
    return { user: createdUser };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Atualizar dados básicos de um usuário do tenant' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({
    type: UserDetailsResponseDto,
    description: 'Retorna o usuário atualizado',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Usuário não tem permissão de "users:update"',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiConflictResponse({ description: 'Email já em uso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  async updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDetailsResponseDto> {
    const updatedUser = await this.usersService.updateUser(user, id, dto);
    return { user: updatedUser };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Ativar ou desativar um usuário do tenant' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiOkResponse({
    type: UserDetailsResponseDto,
    description: 'Retorna o usuário atualizado',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Usuário não tem permissão de "users:update"',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiBadRequestResponse({
    description: 'Não é possível desativar o próprio usuário',
  })
  async updateUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<UserDetailsResponseDto> {
    const updatedUser = await this.usersService.updateUserStatus(user, id, dto);
    return { user: updatedUser };
  }

  @Patch(':id/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Atualizar as roles de um usuário do tenant' })
  @ApiBody({ type: UpdateUserRolesDto })
  @ApiOkResponse({
    type: UserDetailsResponseDto,
    description: 'Retorna o usuário atualizado',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Usuário não tem permissão de "users:update"',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiBadRequestResponse({ description: 'Roles inválidas para o tenant' })
  async updateUserRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ): Promise<UserDetailsResponseDto> {
    const updatedUser = await this.usersService.updateUserRoles(user, id, dto);
    return { user: updatedUser };
  }
}
