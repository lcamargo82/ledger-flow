import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { TenantsController } from './presentation/controllers/tenants.controller';
import { TenantsService } from './application/services/tenants.service';
import { TenantFeatureAccessService } from './application/services/tenant-feature-access.service';

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantFeatureAccessService],
  exports: [TenantsService, TenantFeatureAccessService],
})
export class TenantsModule {}
