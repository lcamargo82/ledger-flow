import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ChannelIntegration,
  ChannelIntegrationStatus,
  ChannelProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { GatewayCredentialsEncryptionService } from '../../../gateways/application/services/gateway-credentials-encryption.service';
import {
  MercadoLivreApiClient,
  MercadoLivreOAuthTokenResponse,
  MercadoLivreTokenRequestError,
} from '../../infra/clients/mercado-livre-api.client';

@Injectable()
export class MercadoLivreCredentialsService {
  private readonly refreshWindowMs = 5 * 60 * 1000;

  constructor(
    private readonly apiClient: MercadoLivreApiClient,
    private readonly encryptionService: GatewayCredentialsEncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async getAccessToken(integration: ChannelIntegration) {
    const credentials = this.encryptionService.decrypt(
      JSON.stringify(integration.encryptedCredentials),
    ) as Record<string, unknown>;
    const accessToken = this.asString(credentials.accessToken);
    const refreshToken = this.asString(credentials.refreshToken);
    if (!accessToken) {
      throw new BadRequestException('Mercado Livre access token is unavailable.');
    }
    if (!this.shouldRefresh(credentials.tokenExpiresAt)) return accessToken;
    if (!refreshToken) {
      await this.requireReauthentication(integration);
      throw new BadRequestException('Mercado Livre authorization must be renewed.');
    }

    try {
      const refreshed = await this.apiClient.refreshAccessToken({
        clientId: this.requiredEnv('MERCADO_LIVRE_CLIENT_ID'),
        clientSecret: this.requiredEnv('MERCADO_LIVRE_CLIENT_SECRET'),
        refreshToken,
      });
      const nextCredentials = this.mergeCredentials(credentials, refreshed);
      await this.persistRefresh(integration, nextCredentials);
      return nextCredentials.accessToken;
    } catch (error) {
      if (this.isRejectedRefresh(error)) {
        await this.requireReauthentication(integration);
        throw new BadRequestException('Mercado Livre authorization must be renewed.');
      }
      throw error;
    }
  }

  private shouldRefresh(tokenExpiresAt: unknown) {
    if (typeof tokenExpiresAt !== 'string') return true;
    const expiresAt = Date.parse(tokenExpiresAt);
    return !Number.isFinite(expiresAt) || expiresAt <= Date.now() + this.refreshWindowMs;
  }

  private mergeCredentials(
    credentials: Record<string, unknown>,
    response: MercadoLivreOAuthTokenResponse,
  ) {
    return {
      ...credentials,
      accessToken: response.access_token,
      refreshToken: response.refresh_token ?? credentials.refreshToken,
      tokenExpiresAt: new Date(Date.now() + response.expires_in * 1000).toISOString(),
      externalAccountId: String(response.user_id ?? credentials.externalAccountId),
      scope: response.scope ?? credentials.scope,
      provider: ChannelProvider.MERCADO_LIVRE,
    };
  }

  private async persistRefresh(
    integration: ChannelIntegration,
    credentials: Record<string, unknown> & { accessToken: string },
  ) {
    const encryptedCredentials = this.encryptionService.encrypt(credentials);
    const result = await this.prisma.channelIntegration.updateMany({
      where: {
        id: integration.id,
        tenantId: integration.tenantId,
        provider: ChannelProvider.MERCADO_LIVRE,
        credentialsVersion: integration.credentialsVersion,
      },
      data: {
        encryptedCredentials: encryptedCredentials as Prisma.InputJsonValue,
        credentialsVersion: { increment: 1 },
        credentialsFingerprint: this.encryptionService.createFingerprint(credentials),
        status: ChannelIntegrationStatus.ACTIVE,
        lastSuccessfulOperationAt: new Date(),
        lastFailureAt: null,
      },
    });
    if (result.count > 0) {
      await this.audit(integration, 'channels.mercado_livre.oauth.token_refreshed');
    }
  }

  private async requireReauthentication(integration: ChannelIntegration) {
    await this.prisma.channelIntegration.updateMany({
      where: {
        id: integration.id,
        tenantId: integration.tenantId,
        provider: ChannelProvider.MERCADO_LIVRE,
      },
      data: {
        status: ChannelIntegrationStatus.REAUTH_REQUIRED,
        lastFailureAt: new Date(),
      },
    });
    await this.audit(integration, 'channels.mercado_livre.oauth.reauthentication_required');
  }

  private audit(integration: ChannelIntegration, action: string) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: integration.tenantId,
        action,
        entityType: 'ChannelIntegration',
        entityId: integration.id,
        metadata: { provider: ChannelProvider.MERCADO_LIVRE },
      },
    });
  }

  private isRejectedRefresh(error: unknown) {
    return (
      error instanceof MercadoLivreTokenRequestError &&
      (error.status === 400 || error.status === 401)
    );
  }

  private requiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new BadRequestException(`${name} is not configured.`);
    return value;
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value : '';
  }
}
