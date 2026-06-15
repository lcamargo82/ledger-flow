import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { PermissionsResponseDto } from '../dto/permissions-response.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions(): Promise<PermissionsResponseDto> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });

    return {
      data: permissions.map((perm) => ({
        id: perm.id,
        key: perm.key,
        description: perm.description ?? undefined,
        createdAt: perm.createdAt,
        updatedAt: perm.updatedAt,
      })),
    };
  }
}
