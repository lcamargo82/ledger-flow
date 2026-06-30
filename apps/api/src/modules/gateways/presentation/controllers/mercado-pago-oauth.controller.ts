import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/presentation/guards/permission.guard';
import { MercadoPagoOAuthService } from '../../infra/providers/mercado-pago/mercado-pago-oauth.service';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { GatewayConfigurationsRepository } from '../../domain/repositories/gateway-configurations.repository';
import {
  PaymentProvider,
  GatewayEnvironment,
  GatewayConfigurationStatus,
} from '@prisma/client';

@Controller('gateways/mercado-pago')
export class MercadoPagoOAuthController {
  constructor(
    private readonly oauthService: MercadoPagoOAuthService,
    private readonly gatewayConfigRepo: GatewayConfigurationsRepository,
  ) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('gateway:manage')
  async connect(@CurrentUser() user: AuthenticatedUser) {
    const authorizationUrl = await this.oauthService.generateAuthUrl(
      user.tenantId,
      user.id,
    );
    return { authorizationUrl };
  }

  @Get('oauth/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    try {
      if (!code || !state) {
        throw new Error('Code and state are required');
      }

      await this.oauthService.handleCallback(code, state);

      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5180';
      return res.redirect(
        `${frontendUrl}/settings/gateways?success=true&provider=mercado-pago`,
      );
    } catch (error) {
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5180';
      return res.redirect(
        `${frontendUrl}/settings/gateways?error=true&provider=mercado-pago`,
      );
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('gateway:manage')
  async disconnect(@CurrentUser() user: AuthenticatedUser) {
    await this.oauthService.disconnect(user.tenantId, user.id);
    return { success: true };
  }

  @Get('connection-status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('gateway:read')
  async getConnectionStatus(@CurrentUser() user: AuthenticatedUser) {
    const isTestMode = process.env.MERCADO_PAGO_TEST_MODE === 'true';
    const environment = isTestMode
      ? GatewayEnvironment.TEST
      : GatewayEnvironment.LIVE;

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
