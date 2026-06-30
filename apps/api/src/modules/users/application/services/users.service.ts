import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  ListUsersQueryDto,
  UserStatusFilter,
} from '../dto/list-users-query.dto';
import { PaginatedUsersResponseDto } from '../dto/paginated-users-response.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import { AuthenticatedUser } from '../../../../modules/auth/application/types/authenticated-user.type';
import { User, UserRole, Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type UserWithRoles = User & { roles: (UserRole & { role: Role })[] };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(
    tenantId: string,
    query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    const { page = 1, perPage = 10, search, status, role } = query;

    const skip = (page - 1) * perPage;
    const take = perPage;

    const where: Prisma.UserWhereInput = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== UserStatusFilter.ALL) {
      where.active = status === UserStatusFilter.ACTIVE;
    }

    if (role) {
      where.roles = {
        some: {
          role: {
            key: role,
          },
        },
      };
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return {
      data: users.map((u) => this.toUserResponse(u)),
      meta: {
        page,
        perPage,
        total,
        totalPages,
      },
    };
  }

  async getUserById(
    tenantId: string,
    userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.toUserResponse(user);
  }

  async createUser(
    currentUser: AuthenticatedUser,
    dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const { tenantId } = currentUser;
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists in this tenant');
    }

    const roles = await this.prisma.role.findMany({
      where: {
        key: { in: dto.roleKeys },
        tenantId,
      },
    });

    if (roles.length !== dto.roleKeys.length) {
      throw new BadRequestException(
        'One or more roles are invalid for this tenant',
      );
    }

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId,
          name: dto.name,
          email,
          passwordHash,
          active: dto.active ?? true,
        },
      });

      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: newUser.id,
            roleId: role.id,
          })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: newUser.id },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });
    });

    return this.toUserResponse(user);
  }

  async updateUser(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const { tenantId } = currentUser;

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let updatedEmail = user.email;
    if (dto.email) {
      updatedEmail = dto.email.trim().toLowerCase();
      if (updatedEmail !== user.email) {
        const existingEmail = await this.prisma.user.findFirst({
          where: { email: updatedEmail, tenantId, id: { not: id } },
        });

        if (existingEmail) {
          throw new ConflictException('Email already in use by another user');
        }
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: updatedEmail,
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    return this.toUserResponse(updatedUser);
  }

  async updateUserStatus(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    const { tenantId } = currentUser;

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (currentUser.id === id && !dto.active) {
      throw new BadRequestException(
        'You cannot deactivate your own user account',
      );
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { active: dto.active },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      if (!dto.active) {
        await tx.userSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return u;
    });

    return this.toUserResponse(updatedUser);
  }

  async updateUserRoles(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateUserRolesDto,
  ): Promise<UserResponseDto> {
    const { tenantId } = currentUser;

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = await this.prisma.role.findMany({
      where: {
        key: { in: dto.roleKeys },
        tenantId,
      },
    });

    if (roles.length !== dto.roleKeys.length) {
      throw new BadRequestException(
        'One or more roles are invalid for this tenant',
      );
    }

    if (currentUser.id === id) {
      const isCurrentlyOwner = user.roles.some((r) => r.role.key === 'OWNER');
      const isRemovingOwner = !dto.roleKeys.includes('OWNER');

      if (isCurrentlyOwner && isRemovingOwner) {
        throw new ForbiddenException(
          'You cannot remove the OWNER role from your own account',
        );
      }
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId: id },
      });

      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: id,
            roleId: role.id,
          })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });
    });

    return this.toUserResponse(updatedUser);
  }

  private toUserResponse(user: UserWithRoles): UserResponseDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      active: user.active,
      roles: user.roles?.map((ur) => ur.role.key) || [],
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
