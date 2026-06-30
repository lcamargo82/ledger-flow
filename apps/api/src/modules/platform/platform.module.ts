import { Module } from '@nestjs/common';
import { PlatformTenantsController } from './presentation/controllers/platform-tenants.controller';
import { PlatformAuditController } from './presentation/controllers/platform-audit.controller';
import { PlatformTenantsService } from './application/services/platform-tenants.service';
import { TenantProvisioningService } from './application/services/tenant-provisioning.service';
import { TenantInvitationService } from './application/services/tenant-invitation.service';
import { PlatformAuditService } from './application/services/platform-audit.service';
import { PlatformSupportService } from './application/services/platform-support.service';
import { PlatformTenantsRepository } from './domain/repositories/platform-tenants.repository';
import { TenantAdminInvitationsRepository } from './domain/repositories/tenant-admin-invitations.repository';
import { PrismaPlatformTenantsRepository } from './infra/repositories/prisma-platform-tenants.repository';
import { PrismaTenantAdminInvitationsRepository } from './infra/repositories/prisma-tenant-admin-invitations.repository';
import { PrismaPlatformAuditRepository } from './infra/repositories/prisma-platform-audit.repository';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { TenantInvitationsController } from './presentation/controllers/tenant-invitations.controller';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [PlatformTenantsController, TenantInvitationsController, PlatformAuditController],
  providers: [
    PlatformTenantsService,
    TenantProvisioningService,
    TenantInvitationService,
    PlatformAuditService,
    PlatformSupportService,
    {
      provide: PlatformTenantsRepository,
      useClass: PrismaPlatformTenantsRepository,
    },
    {
      provide: TenantAdminInvitationsRepository,
      useClass: PrismaTenantAdminInvitationsRepository,
    },
    {
      provide: 'PlatformAuditRepository',
      useClass: PrismaPlatformAuditRepository,
    },
  ],
})
export class PlatformModule {}
