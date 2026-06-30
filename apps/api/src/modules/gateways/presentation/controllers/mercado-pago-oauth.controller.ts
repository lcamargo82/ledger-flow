import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/presentation/guards/permission.guard';
import { MercadoPagoOAuthService } from '../../infra/providers/mercado-pago/mercado-pago-oauth.service';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { GatewayConfigurationsRepository } from '../../domain/repositories/gateway-configurations.repository';
import { PaymentProvider, GatewayEnvironment, GatewayConfigurationStatus } from '@prisma/client';

@Controller('gateways')
export class MercadoPagoOAuthController {
  constructor(
    private readonly oauthService: MercadoPagoOAuthService,
    private readonly gatewayConfigRepo: GatewayConfigurationsRepository,
  ) {}

  @Post('connections/mercado-pago/connect')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('gateways:create')
  async connect(@CurrentUser() user: AuthenticatedUser) {
    const authorizationUrl = await this.oauthService.generateAuthUrl(user.tenantId, user.id);
    return { authorizationUrl };
  }

  @Get('mercado-pago/oauth/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      if (!code || !state) {
        throw new Error('Code and state are required');
      }

      await this.oauthService.handleCallback(code, state);

      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5180';
      return res.redirect(`${frontendUrl}/settings/gateway-connections?success=true&provider=mercado-pago`);
    } catch {
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5180';
      return res.redirect(`${frontendUrl}/settings/gateway-connections?error=true&provider=mercado-pago`);
    }
  }

  @Post('connections/mercado-pago/disconnect')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('gateways:manage')
  async disconnect(@CurrentUser() user: AuthenticatedUser) {
    await this.oauthService.disconnect(user.tenantId, user.id);
    return { success: true };
  }

  @Get('connections/mercado-pago/status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('gateways:read')
  async getConnectionStatus(@CurrentUser() user: AuthenticatedUser) {
    const isTestMode = process.env.MERCADO_PAGO_TEST_MODE === 'true';
    const environment = isTestMode ? GatewayEnvironment.TEST : GatewayEnvironment.LIVE;

    const config = await this.gatewayConfigRepo.findActiveByTenantAndProvider(
      user.tenantId,
      PaymentProvider.MERCADO_PAGO,
      environment,
    );

    if (config && config.status === GatewayConfigurationStatus.ACTIVE) {
      return {
        connected: true,
        provider: 'MERCADO_PAGO',
        environment: config.environment,
        status: config.status,
        supportedMethods: config.supportedMethods || ['PIX', 'BOLETO'],
        connectedAt: config.createdAt,
      };
    }

    return {
      connected: false,
      provider: 'MERCADO_PAGO',
    };
  }
}
