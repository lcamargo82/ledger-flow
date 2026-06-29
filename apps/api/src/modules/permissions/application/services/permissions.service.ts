import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { PermissionsResponseDto } from '../dto/permissions-response.dto';
import type { AuthenticatedUser } from '../../../../modules/auth/application/types/authenticated-user.type';
import { PermissionScope } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions(user: AuthenticatedUser): Promise<PermissionsResponseDto> {
    const whereClause: any = {};
    if (user.tenantKind !== 'PLATFORM') {
      whereClause.scope = PermissionScope.TENANT;
    }

    const permissions = await this.prisma.permission.findMany({
      where: whereClause,
      orderBy: { key: 'asc' },
    });

    return {
      data: permissions.map((perm) => ({
        id: perm.id,
        key: perm.key,
        description: perm.description ?? undefined,
        scope: perm.scope,
        createdAt: perm.createdAt,
        updatedAt: perm.updatedAt,
      })),
    };
  }
}
