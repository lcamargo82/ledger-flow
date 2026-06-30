import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { RolesResponseDto } from '../dto/roles-response.dto';
import { RoleResponseDto } from '../dto/role-response.dto';
import type { AuthenticatedUser } from '../../../../modules/auth/application/types/authenticated-user.type';
import { PermissionScope } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles(user: AuthenticatedUser): Promise<RolesResponseDto> {
    const roles = await this.prisma.role.findMany({
      where: { tenantId: user.tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: [{ system: 'desc' }, { name: 'asc' }],
    });

    return {
      data: roles.map((role) => ({
        id: role.id,
        tenantId: role.tenantId,
        name: role.name,
        key: role.key,
        description: role.description ?? undefined,
        system: role.system,
        permissions: role.permissions
          .filter(
            (rp) =>
              user.tenantKind === 'PLATFORM' ||
              rp.permission.scope === PermissionScope.TENANT,
          )
          .map((rp) => rp.permission.key),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
    };
  }

  async getRoleById(
    user: AuthenticatedUser,
    roleId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: user.tenantId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      key: role.key,
      description: role.description ?? undefined,
      system: role.system,
      permissions: role.permissions
        .filter(
          (rp) =>
            user.tenantKind === 'PLATFORM' ||
            rp.permission.scope === PermissionScope.TENANT,
        )
        .map((rp) => rp.permission.key),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
