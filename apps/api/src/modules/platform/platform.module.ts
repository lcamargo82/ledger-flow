import { Module } from '@nestjs/common';
import { PlatformTenantsController } from './presentation/controllers/platform-tenants.controller';
import { PlatformTenantsService } from './application/services/platform-tenants.service';
import { PlatformTenantsRepository } from './domain/repositories/platform-tenants.repository';
import { PrismaPlatformTenantsRepository } from './infra/repositories/prisma-platform-tenants.repository';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformTenantsController],
  providers: [
    PlatformTenantsService,
    {
      provide: PlatformTenantsRepository,
      useClass: PrismaPlatformTenantsRepository,
    },
  ],
})
export class PlatformModule {}
