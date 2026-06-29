import { Module } from '@nestjs/common';
import { PlatformTenantsController } from './presentation/controllers/platform-tenants.controller';
import { PlatformAuditController } from './presentation/controllers/platform-audit.controller';
import { PlatformTenantsService } from './application/services/platform-tenants.service';
import { PlatformAuditService } from './application/services/platform-audit.service';
import { PlatformSupportService } from './application/services/platform-support.service';
import { PlatformTenantsRepository } from './domain/repositories/platform-tenants.repository';
import { PrismaPlatformTenantsRepository } from './infra/repositories/prisma-platform-tenants.repository';
import { PrismaPlatformAuditRepository } from './infra/repositories/prisma-platform-audit.repository';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformTenantsController, PlatformAuditController],
  providers: [
    PlatformTenantsService,
    PlatformAuditService,
    PlatformSupportService,
    {
      provide: PlatformTenantsRepository,
      useClass: PrismaPlatformTenantsRepository,
    },
    {
      provide: 'PlatformAuditRepository',
      useClass: PrismaPlatformAuditRepository,
    },
  ],
})
export class PlatformModule {}
