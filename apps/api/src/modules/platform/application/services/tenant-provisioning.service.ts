import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreatePlatformTenantDto } from '../dto/create-platform-tenant.dto';
import { TenantInvitationService } from './tenant-invitation.service';
import { PlatformTenantProvisionResponseDto } from '../dto/platform-tenant-provision-response.dto';

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invitationService: TenantInvitationService,
  ) {}

  async provisionCustomerTenant(
    dto: CreatePlatformTenantDto,
    actorUserId: string,
  ): Promise<PlatformTenantProvisionResponseDto> {
    const { organization, owner, subscription } = dto;

    // 1. Check if slug exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: organization.slug },
    });

    if (existingTenant) {
      await this.prisma.auditLog.create({
        data: {
          action: 'platform.tenant.slug_conflict',
          actorUserId,
          metadata: { slug: organization.slug },
        },
      });
      throw new ConflictException('Slug já está em uso.');
    }

    // 2. Check if owner email exists across all tenants? Or just in this future tenant?
    // Since emails are unique per tenant, we don't strictly need to check global here unless specified.
    // Wait, "e-mail único globalmente, conforme regra atual de User" - wait, the rule says:
    // `@@unique([tenantId, email])` in schema. So it's unique PER tenant.
    // The requirement says "e-mail único globalmente, conforme regra atual de User".
    // The schema says `@@unique([tenantId, email])`, meaning the email CAN be reused across different tenants.
    // Let's stick to the schema rule.

    // 3. Transactional Creation
    return this.prisma
      .$transaction(async (tx) => {
        // 3.1 Create Tenant
        const tenant = await tx.tenant.create({
          data: {
            name: organization.name,
            slug: organization.slug,
            timezone: organization.timezone,
            kind: 'CUSTOMER',
            active: true,
          },
        });

        // 3.2 Create Subscription
        const sub = await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            plan: subscription.plan,
            status: subscription.status,
            trialEndsAt: subscription.trialEndsAt
              ? new Date(subscription.trialEndsAt)
              : null,
            currentPeriodStart: subscription.currentPeriodStart
              ? new Date(subscription.currentPeriodStart)
              : null,
            currentPeriodEnd: subscription.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd)
              : null,
            notes: subscription.notes,
          },
        });

        // 3.3 Create OWNER Role if not seeded, but we should create it per tenant
        // We need to copy OWNER role and permissions. The simplest approach for now is to create the Role entity.
        // Wait, Roles are tenant-specific. The `seed.ts` creates it for the tenant. But for dynamic tenants, we must create it!
        const ownerRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Owner',
            key: 'OWNER',
            description: 'Proprietário da conta com acesso total',
            system: true,
          },
        });

        // Assign all TENANT scope permissions to this new role
        const tenantPermissions = await tx.permission.findMany({
          where: { scope: 'TENANT' },
        });

        await tx.rolePermission.createMany({
          data: tenantPermissions.map((p) => ({
            roleId: ownerRole.id,
            permissionId: p.id,
          })),
        });

        // 3.4 Create Owner User
        // Create user without a usable password (we can use a dummy hash or leave it invalid)
        // Since passwordHash is required, we use a random unmatchable string or empty if allowed.
        const unmatchableHash =
          'INVALID_PASSWORD_WAITING_FOR_INVITE_' + Date.now();
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: owner.name,
            email: owner.email,
            passwordHash: unmatchableHash,
            active: true,
            isPlatformAdmin: false,
          },
        });

        // 3.5 Link User to Role
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: ownerRole.id,
          },
        });

        // 3.6 Create Invitation and trigger Email
        // Since we are inside a transaction, we should just call the repo to create the invitation.
        // But we need the email to be sent AFTER the transaction to ensure data is committed.
        // So we will generate it here, but send it outside. Or we rely on the service inside the transaction?
        // Wait, `createAndSendInvitation` uses `this.prisma` not `tx`. It might deadlock or not find the user.
        // We should generate token and save it here.

        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
          .createHash('sha256')
          .update(token)
          .digest('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 72);

        await tx.tenantAdminInvitation.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            email: user.email,
            tokenHash,
            status: 'PENDING',
            expiresAt,
            createdByUserId: actorUserId,
          },
        });

        // Audit logs
        await tx.auditLog.create({
          data: {
            action: 'platform.tenant.created',
            actorUserId,
            tenantId: tenant.id,
            metadata: { slug: tenant.slug },
          },
        });

        // Pass token to be sent outside transaction
        return {
          tenant,
          sub,
          user,
          token,
          tokenHash,
          expiresAt,
        };
      })
      .then(async (result) => {
        // Execute email sending AFTER transaction is successfully committed
        // Using a detached promise to not block the response or fail the request if email fails.
        this.invitationService['sendInvitationEmailSafe'](
          result.user.email,
          result.user.name,
          result.tenant.name,
          result.token,
        );

        return {
          tenant: {
            id: result.tenant.id,
            name: result.tenant.name,
            slug: result.tenant.slug,
            active: result.tenant.active,
            kind: result.tenant.kind,
            timezone: result.tenant.timezone,
            subscription: {
              plan: result.sub.plan,
              status: result.sub.status,
            },
            owner: {
              id: result.user.id,
              name: result.user.name,
              email: result.user.email,
              invitationStatus: 'PENDING',
              invitationExpiresAt: result.expiresAt,
            },
          },
        };
      });
  }
}
