import { Module } from '@nestjs/common';
import { PlatformTenantsController } from './presentation/controllers/platform-tenants.controller';
import { PlatformTenantsService } from './application/services/platform-tenants.service';
import { TenantProvisioningService } from './application/services/tenant-provisioning.service';
import { TenantInvitationService } from './application/services/tenant-invitation.service';
import { PlatformTenantsRepository } from './domain/repositories/platform-tenants.repository';
import { TenantAdminInvitationsRepository } from './domain/repositories/tenant-admin-invitations.repository';
import { PrismaPlatformTenantsRepository } from './infra/repositories/prisma-platform-tenants.repository';
import { PrismaTenantAdminInvitationsRepository } from './infra/repositories/prisma-tenant-admin-invitations.repository';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { TenantInvitationsController } from './presentation/controllers/tenant-invitations.controller';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [PlatformTenantsController, TenantInvitationsController],
  providers: [
    PlatformTenantsService,
    TenantProvisioningService,
    TenantInvitationService,
    {
      provide: PlatformTenantsRepository,
      useClass: PrismaPlatformTenantsRepository,
    },
    {
      provide: TenantAdminInvitationsRepository,
      useClass: PrismaTenantAdminInvitationsRepository,
    },
  ],
})
export class PlatformModule {}
