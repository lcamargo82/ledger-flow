import { AsyncModule } from './modules/async/async.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EmailModule } from './modules/email/email.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { JwtAuthGuard } from './modules/auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from './modules/auth/presentation/guards/permission.guard';
import { PlatformAdminGuard } from './modules/auth/presentation/guards/platform-admin.guard';
import { CapabilityGuard } from './modules/auth/presentation/guards/capability.guard';
import { PlatformModule } from './modules/platform/platform.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { FinancialIntelligenceModule } from './modules/financial-intelligence/financial-intelligence.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    TenantsModule,
    CustomersModule,
    EmailModule,
    PaymentsModule,
    WebhooksModule,
    PlatformModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    ChannelsModule,
    FinancialIntelligenceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PlatformAdminGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CapabilityGuard,
    },
  ],
})
export class AppModule {}
