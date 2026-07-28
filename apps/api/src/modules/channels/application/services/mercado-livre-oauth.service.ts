import { BadRequestException, Injectable } from '@nestjs/common';
import { ChannelIntegrationStatus, ChannelProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { GatewayCredentialsEncryptionService } from '../../../gateways/application/services/gateway-credentials-encryption.service';
import {
  MercadoLivreApiClient,
  MercadoLivreOAuthTokenResponse,
} from '../../infra/clients/mercado-livre-api.client';
import { MercadoLivreOAuthStateService } from './mercado-livre-oauth-state.service';

export interface AuthorizationUrlResult {
  authorizationUrl: string;
}

@Injectable()
export class MercadoLivreOAuthService {
  constructor(
    private readonly apiClient: MercadoLivreApiClient,
    private readonly stateService: MercadoLivreOAuthStateService,
    private readonly encryptionService: GatewayCredentialsEncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAuthorizationUrl(
    tenantId: string,
    actorUserId: string,
  ): Promise<AuthorizationUrlResult> {
    const clientId = this.requiredEnv('MERCADO_LIVRE_CLIENT_ID');
    const oauthBaseUrl = this.requiredEnv('MERCADO_LIVRE_OAUTH_BASE_URL');
    const redirectUri = this.redirectUri();
    const state = await this.stateService.generateState(tenantId, actorUserId);
    const url = new URL('/authorization', oauthBaseUrl);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    await this.audit(
      tenantId,
      actorUserId,
      'channels.mercado_livre.oauth.connection_requested',
      'NEW',
      { provider: ChannelProvider.MERCADO_LIVRE },
    );

    return { authorizationUrl: url.toString() };
  }

  async handleCallback(code: string, state: string) {
    const stateData = await this.stateService.validateAndConsumeState(state);
    if (!stateData) {
      throw new BadRequestException('Invalid or expired OAuth state.');
    }

    const clientId = this.requiredEnv('MERCADO_LIVRE_CLIENT_ID');
    const clientSecret = this.requiredEnv('MERCADO_LIVRE_CLIENT_SECRET');
    const tokenResponse = await this.apiClient.exchangeAuthorizationCode({
      code,
      clientId,
      clientSecret,
      redirectUri: this.redirectUri(),
    });
    const credentials = this.toCredentials(tokenResponse);
    const encryptedCredentials = this.encryptionService.encrypt(credentials);
    const decrypted = this.encryptionService.decrypt(JSON.stringify(encryptedCredentials));

    if (
      decrypted.accessToken !== credentials.accessToken ||
      decrypted.refreshToken !== credentials.refreshToken
    ) {
      throw new BadRequestException('Encrypted credentials round-trip failed.');
    }

    const externalAccountId = credentials.externalAccountId;
    const fingerprint = this.encryptionService.createFingerprint(credentials);
    const integration = await this.prisma.channelIntegration.upsert({
      where: {
        tenantId_provider_externalAccountId: {
          tenantId: stateData.tenantId,
          provider: ChannelProvider.MERCADO_LIVRE,
          externalAccountId,
        },
      },
      create: {
        tenantId: stateData.tenantId,
        provider: ChannelProvider.MERCADO_LIVRE,
        name: `Mercado Livre ${externalAccountId}`,
        externalAccountId,
        displayName: `Mercado Livre ${externalAccountId}`,
        status: ChannelIntegrationStatus.ACTIVE,
        encryptedCredentials: encryptedCredentials as Prisma.InputJsonValue,
        credentialsVersion: 1,
        credentialsFingerprint: fingerprint,
        settingsJson: {
          scopes: credentials.scope ? String(credentials.scope).split(' ') : [],
          syncEnabled: false,
          stockSyncMode: 'AVAILABLE',
          importListingsOnConnect: false,
        },
        createdByUserId: stateData.userId,
        lastSuccessfulOperationAt: new Date(),
      },
      update: {
        status: ChannelIntegrationStatus.ACTIVE,
        encryptedCredentials: encryptedCredentials as Prisma.InputJsonValue,
        credentialsVersion: { increment: 1 },
        credentialsFingerprint: fingerprint,
        displayName: `Mercado Livre ${externalAccountId}`,
        lastSuccessfulOperationAt: new Date(),
        lastFailureAt: null,
      },
    });

    await this.audit(
      stateData.tenantId,
      stateData.userId,
      'channels.mercado_livre.oauth.connection_succeeded',
      integration.id,
      { provider: ChannelProvider.MERCADO_LIVRE, externalAccountId },
    );

    return { integrationId: integration.id, status: integration.status };
  }

  async disconnect(tenantId: string, actorUserId: string, integrationId: string) {
    const result = await this.prisma.channelIntegration.updateMany({
      where: {
        id: integrationId,
        tenantId,
        provider: ChannelProvider.MERCADO_LIVRE,
      },
      data: {
        status: ChannelIntegrationStatus.DISABLED,
        encryptedCredentials: Prisma.JsonNull,
        credentialsFingerprint: null,
      },
    });

    if (result.count > 0) {
      await this.audit(
        tenantId,
        actorUserId,
        'channels.mercado_livre.oauth.disconnected',
        integrationId,
        { provider: ChannelProvider.MERCADO_LIVRE },
      );
    }
  }

  private redirectUri() {
    const callbackBaseUrl = this.requiredEnv('MERCADO_LIVRE_CALLBACK_BASE_URL');
    return `${callbackBaseUrl.replace(/\/$/, '')}/channels/mercado-livre/callback`;
  }

  private requiredEnv(name: string) {
    const value = process.env[name];
    if (!value) {
      throw new BadRequestException(`${name} is not configured.`);
    }
    return value;
  }

  private toCredentials(tokenResponse: MercadoLivreOAuthTokenResponse) {
    const externalAccountId = String(tokenResponse.user_id);
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
      externalAccountId,
      scope: tokenResponse.scope,
      provider: ChannelProvider.MERCADO_LIVRE,
    };
  }

  private async audit(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'ChannelIntegration',
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
