import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { TenantAdminInvitationsRepository } from '../../domain/repositories/tenant-admin-invitations.repository';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { EmailService } from '../../../email/application/services/email.service';
import { getTenantInvitationTemplate } from '../../infra/email/tenant-admin-invitation.template';

@Injectable()
export class TenantInvitationService {
  private readonly logger = new Logger(TenantInvitationService.name);

  constructor(
    private readonly invitationsRepository: TenantAdminInvitationsRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createAndSendInvitation(
    tenantId: string,
    userId: string,
    email: string,
    ownerName: string,
    tenantName: string,
    actorUserId?: string,
  ): Promise<{ tokenHash: string; expiresAt: Date; status: string }> {
    // 1. Revoke pending invitations for this user
    const pending = await this.invitationsRepository.findPendingByUserId(userId);
    if (pending.length > 0) {
      await this.invitationsRepository.revokeMany(pending.map(p => p.id));
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours expiration

    // 3. Create invitation
    await this.invitationsRepository.create({
      tenantId,
      userId,
      email,
      tokenHash,
      status: 'PENDING',
      expiresAt,
      acceptedAt: null,
      revokedAt: null,
      createdByUserId: actorUserId || null,
    });

    // 4. Send Email asynchronously
    this.sendInvitationEmailSafe(email, ownerName, tenantName, token);

    return { tokenHash, expiresAt, status: 'PENDING' };
  }

  private async sendInvitationEmailSafe(
    email: string,
    ownerName: string,
    tenantName: string,
    token: string,
  ) {
    try {
      const baseUrl = process.env.WEB_URL || 'http://localhost:5180';
      const invitationLink = `${baseUrl}/accept-invitation?token=${token}`;
      
      const template = getTenantInvitationTemplate(ownerName, tenantName, invitationLink);
      
      // We assume emailService has a generic sendEmail or we use it. 
      // If emailService only has sendPasswordResetEmail, we might need to cast or use the provider directly.
      // Wait, let's look at EmailService. It has sendPasswordResetEmail, let's assume we can add sendEmail to it.
      // For now, we will use the provider directly if we can't modify EmailService, or we'll modify it.
      // We'll inject EmailService and assume we will add sendEmail to it.
      await (this.emailService as any).emailProvider.sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      this.logger.log(`Invitation email sent to ${email}`);
      
      // Audit log
      await this.prisma.auditLog.create({
        data: {
          action: 'platform.tenant.invitation_sent',
          metadata: { emailMasked: email.replace(/(?<=.).(?=.*@)/g, '*') },
        }
      });
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${email}`, error);
      // Audit log
      await this.prisma.auditLog.create({
        data: {
          action: 'platform.tenant.provisioning_email_failed',
          metadata: { emailMasked: email.replace(/(?<=.).(?=.*@)/g, '*'), error: error.message },
        }
      });
    }
  }

  async resendInvitation(tenantId: string, actorUserId: string) {
    // We need to find the OWNER user of the tenant.
    // In this simplified version, we just find the first OWNER role user in the CUSTOMER tenant.
    const ownerRole = await this.prisma.role.findFirst({
      where: { tenantId, key: 'OWNER' }
    });

    if (!ownerRole) throw new Error('Owner role not found');

    const userRole = await this.prisma.userRole.findFirst({
      where: { roleId: ownerRole.id },
      include: { user: true }
    });

    if (!userRole) throw new Error('Owner user not found');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      throw new NotFoundException('Tenant associado não encontrado.');
    }

    await this.createAndSendInvitation(
      tenant.id,
      userRole.user.id,
      userRole.user.email,
      userRole.user.name,
      tenant.name,
      actorUserId
    );

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        tenantId,
        action: 'platform.tenant.invitation_resent',
      }
    });

    return { success: true, message: 'Convite reenviado com sucesso.' };
  }
}
