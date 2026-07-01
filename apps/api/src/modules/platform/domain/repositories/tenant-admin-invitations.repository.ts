import { TenantAdminInvitation } from '@prisma/client';

export abstract class TenantAdminInvitationsRepository {
  abstract create(
    data: Omit<TenantAdminInvitation, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TenantAdminInvitation>;
  abstract findByTokenHash(tokenHash: string): Promise<TenantAdminInvitation | null>;
  abstract findPendingByUserId(userId: string): Promise<TenantAdminInvitation[]>;
  abstract updateStatus(
    id: string,
    status: 'ACCEPTED' | 'REVOKED' | 'EXPIRED',
    timestampKey: 'acceptedAt' | 'revokedAt',
  ): Promise<TenantAdminInvitation>;
  abstract revokeMany(ids: string[]): Promise<void>;
}
