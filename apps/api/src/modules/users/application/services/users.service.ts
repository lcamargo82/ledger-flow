import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ListUsersQueryDto, UserStatusFilter } from '../dto/list-users-query.dto';
import { PaginatedUsersResponseDto } from '../dto/paginated-users-response.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { User, UserRole, Role } from '@prisma/client';

type UserWithRoles = User & { roles: (UserRole & { role: Role })[] };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(tenantId: string, query: ListUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    const { page = 1, perPage = 10, search, status, role } = query;

    const skip = (page - 1) * perPage;
    const take = perPage;

    const where: any = {
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

  async getUserById(tenantId: string, userId: string): Promise<UserResponseDto> {
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
