/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { TenantAdminInvitationsRepository } from '../../domain/repositories/tenant-admin-invitations.repository';
import { TenantAdminInvitation } from '@prisma/client';

@Injectable()
export class PrismaTenantAdminInvitationsRepository implements TenantAdminInvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<TenantAdminInvitation, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TenantAdminInvitation> {
    return this.prisma.tenantAdminInvitation.create({
      data,
    });
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<TenantAdminInvitation | null> {
    return this.prisma.tenantAdminInvitation.findUnique({
      where: { tokenHash },
    });
  }

  async findPendingByUserId(userId: string): Promise<TenantAdminInvitation[]> {
    return this.prisma.tenantAdminInvitation.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
    });
  }

  async updateStatus(
    id: string,
    status: 'ACCEPTED' | 'REVOKED' | 'EXPIRED',
    timestampKey: 'acceptedAt' | 'revokedAt',
  ): Promise<TenantAdminInvitation> {
    const data: any = { status };
    data[timestampKey] = new Date();

    return this.prisma.tenantAdminInvitation.update({
      where: { id },
      data,
    });
  }

  async revokeMany(ids: string[]): Promise<void> {
    await this.prisma.tenantAdminInvitation.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });
  }
}
