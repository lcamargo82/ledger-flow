import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { RolesResponseDto } from '../dto/roles-response.dto';
import { RoleResponseDto } from '../dto/role-response.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles(tenantId: string): Promise<RolesResponseDto> {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
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
        permissions: role.permissions.map((rp) => rp.permission.key),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
    };
  }

  async getRoleById(
    tenantId: string,
    roleId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId,
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
      permissions: role.permissions.map((rp) => rp.permission.key),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
