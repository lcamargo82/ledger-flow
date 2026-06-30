import { Injectable, Logger } from '@nestjs/common';
import { GatewayConfigurationStatus, GatewayEnvironment, PaymentProvider } from '@prisma/client';
import { MercadoPagoApiClient } from './mercado-pago-api.client';
import { MercadoPagoOAuthStateService } from './mercado-pago-oauth-state.service';
import { MercadoPagoCredentialsMapper } from './mercado-pago-credentials.mapper';
import { GatewayConfigurationsRepository } from '../../../domain/repositories/gateway-configurations.repository';
import { GatewayCredentialsEncryptionService } from '../../../application/services/gateway-credentials-encryption.service';
import { PrismaService } from '../../../../../database/prisma/prisma.service';

@Injectable()
export class MercadoPagoOAuthService {
  private readonly logger = new Logger(MercadoPagoOAuthService.name);

  constructor(
    private readonly apiClient: MercadoPagoApiClient,
    private readonly stateService: MercadoPagoOAuthStateService,
    private readonly gatewayConfigRepo: GatewayConfigurationsRepository,
    private readonly encryptionService: GatewayCredentialsEncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAuthUrl(tenantId: string, userId: string): Promise<string> {
    const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
    const redirectUri = process.env.MERCADO_PAGO_OAUTH_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('Mercado Pago OAuth variables are not properly configured.');
    }

    const state = this.stateService.generateState(tenantId, userId);

    const url = new URL('https://auth.mercadopago.com/authorization');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('platform_id', 'mp');
    url.searchParams.append('state', state);
    url.searchParams.append('redirect_uri', redirectUri);

    this.logger.log(`Generated Mercado Pago OAuth URL for tenant ${tenantId}`);

    this.prisma.auditLog
      .create({
        data: {
          tenantId,
          action: 'mercado_pago.oauth.connection_requested',
          actorUserId: userId,
          entityType: 'GATEWAY_CONFIGURATION',
          entityId: 'NEW',
        },
      })
      .catch((e) => this.logger.error('Failed to log audit:', e));

    return url.toString();
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const stateData = this.stateService.validateAndConsumeState(state);

    if (!stateData) {
      throw new Error('Invalid or expired OAuth state');
    }

    const { tenantId, userId } = stateData;

    this.logger.log(`Handling Mercado Pago OAuth callback for tenant ${tenantId}`);

    const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
    const clientSecret = process.env.MERCADO_PAGO_CLIENT_SECRET;
    const redirectUri = process.env.MERCADO_PAGO_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Mercado Pago OAuth variables are not properly configured.');
    }

    try {
      const tokenResponse = await this.apiClient.exchangeAuthorizationCode(
        code,
        redirectUri,
        clientId,
        clientSecret,
      );

      const credentials = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
        merchantId: String(tokenResponse.user_id),
        scope: tokenResponse.scope,
      };

      const encryptedResponse = await this.encryptionService.encrypt(credentials);
      const encryptedCredentials = encryptedResponse.encryptedData;
      const fingerprint = MercadoPagoCredentialsMapper.deriveFingerprint(credentials);

      const isTestMode = process.env.MERCADO_PAGO_TEST_MODE === 'true';
      const environment = isTestMode ? GatewayEnvironment.TEST : GatewayEnvironment.LIVE;

      const config = await this.gatewayConfigRepo.upsert({
        tenantId,
        provider: PaymentProvider.MERCADO_PAGO,
        environment,
        status: GatewayConfigurationStatus.ACTIVE,
        displayName: 'Mercado Pago',
        supportedMethods: [],
        encryptedCredentials,
        credentialsFingerprint: fingerprint,
      });

      this.prisma.auditLog
        .create({
          data: {
            tenantId,
            action: 'mercado_pago.oauth.connection_succeeded',
            actorUserId: userId,
            entityType: 'GATEWAY_CONFIGURATION',
            entityId: config.id,
            metadata: { environment },
          },
        })
        .catch((e) => this.logger.error('Failed to log audit:', e));
    } catch (error: any) {
      this.logger.error(
        `Failed to handle Mercado Pago callback for tenant ${tenantId}: ${error.message}`,
      );

      this.prisma.auditLog
        .create({
          data: {
            tenantId,
            action: 'mercado_pago.oauth.connection_failed',
            actorUserId: userId,
            entityType: 'GATEWAY_CONFIGURATION',
            entityId: 'NEW',
            metadata: { summary: error.message },
          },
        })
        .catch((e) => this.logger.error('Failed to log audit:', e));

      throw error;
    }
  }

  async disconnect(tenantId: string, userId: string): Promise<void> {
    const isTestMode = process.env.MERCADO_PAGO_TEST_MODE === 'true';
    const environment = isTestMode ? GatewayEnvironment.TEST : GatewayEnvironment.LIVE;

    const config = await this.gatewayConfigRepo.findActiveByTenantAndProvider(
      tenantId,
      PaymentProvider.MERCADO_PAGO,
      environment,
    );

    if (!config) {
      return;
    }

    await this.gatewayConfigRepo.updateStatus(
      config.id,
      tenantId,
      GatewayConfigurationStatus.INACTIVE,
    );

    this.prisma.auditLog
      .create({
        data: {
          tenantId,
          action: 'mercado_pago.oauth.disconnected',
          actorUserId: userId,
          entityType: 'GATEWAY_CONFIGURATION',
          entityId: config.id,
          metadata: { environment },
        },
      })
      .catch((e) => this.logger.error('Failed to log audit:', e));
  }
}
