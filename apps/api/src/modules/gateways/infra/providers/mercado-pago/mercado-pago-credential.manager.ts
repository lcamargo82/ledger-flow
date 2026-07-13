import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import {
  GatewayConfigurationStatus,
  GatewayHealthStatus,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { AuditActions } from '../../../../audit/domain/constants/audit-actions';
import { PrismaService } from '../../../../../database/prisma/prisma.service';
import { GatewayCredentials } from '../../../domain/interfaces/gateway-credentials.interface';
import { GatewayCredentialsInvalidError } from '../../../domain/errors/gateway-errors';
import { GatewayCredentialsEncryptionService } from '../../../application/services/gateway-credentials-encryption.service';
import { NotificationProducerService } from '../../../../notifications/application/services/notification-producer.service';
import { MercadoPagoApiClient, MercadoPagoApiError } from './mercado-pago-api.client';
import { MercadoPagoCredentials } from './mercado-pago.types';
import { MercadoPagoCredentialsMapper } from './mercado-pago-credentials.mapper';

const REAUTH_REQUIRED_STATUS = 'REAUTH_REQUIRED' as GatewayConfigurationStatus;

@Injectable()
export class MercadoPagoCredentialManager {
  private readonly logger = new Logger(MercadoPagoCredentialManager.name);
  private readonly redis: Redis;
  private readonly refreshThresholdMs: number;
  private readonly lockTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: GatewayCredentialsEncryptionService,
    private readonly apiClient: MercadoPagoApiClient,
    private readonly moduleRef: ModuleRef,
    private readonly config: ConfigService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });
    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.refreshThresholdMs =
      Number(this.config.get<string>('MERCADO_PAGO_REFRESH_THRESHOLD_MS')) || 10 * 60 * 1000;
    this.lockTtlSeconds =
      Number(this.config.get<string>('MERCADO_PAGO_REFRESH_LOCK_TTL_SECONDS')) || 30;
  }

  async getValidAccessToken(input: {
    tenantId: string;
    gatewayConfigurationId: string;
    purpose: 'PAYMENT' | 'SETTLEMENT' | 'WEBHOOK_ENRICHMENT';
  }): Promise<string> {
    const credentials = await this.getValidCredentials(input);
    if (!credentials.accessToken) {
      throw new GatewayCredentialsInvalidError('Mercado Pago access token is missing.');
    }
    return credentials.accessToken;
  }

  async getValidCredentials(input: {
    tenantId: string;
    gatewayConfigurationId: string;
    purpose: 'PAYMENT' | 'SETTLEMENT' | 'WEBHOOK_ENRICHMENT';
  }): Promise<GatewayCredentials> {
    const configuration = await this.prisma.gatewayConfiguration.findFirst({
      where: {
        id: input.gatewayConfigurationId,
        tenantId: input.tenantId,
        provider: PaymentProvider.MERCADO_PAGO,
      },
    });

    if (!configuration || !configuration.encryptedCredentials) {
      throw new GatewayCredentialsInvalidError('Mercado Pago credentials are not configured.');
    }

    if (configuration.status !== GatewayConfigurationStatus.ACTIVE) {
      throw new GatewayCredentialsInvalidError('Mercado Pago connection requires reconnection.');
    }

    const credentials = this.toMercadoPagoCredentials(
      this.encryptionService.decrypt(configuration.encryptedCredentials),
    );

    if (!this.shouldRefresh(credentials)) {
      return credentials;
    }

    const lockKey = `lock:mercado-pago:refresh:${configuration.id}`;
    const lockToken = cryptoRandomToken();
    const lockAcquired = await this.redis.set(lockKey, lockToken, 'EX', this.lockTtlSeconds, 'NX');

    if (lockAcquired !== 'OK') {
      return this.waitForFreshCredentials(input, credentials.tokenExpiresAt);
    }

    try {
      const latest = await this.prisma.gatewayConfiguration.findFirst({
        where: {
          id: input.gatewayConfigurationId,
          tenantId: input.tenantId,
          provider: PaymentProvider.MERCADO_PAGO,
        },
      });

      if (!latest || !latest.encryptedCredentials) {
        throw new GatewayCredentialsInvalidError('Mercado Pago credentials are not configured.');
      }

      const latestCredentials = this.toMercadoPagoCredentials(
        this.encryptionService.decrypt(latest.encryptedCredentials),
      );

      if (!this.shouldRefresh(latestCredentials)) {
        return latestCredentials;
      }

      return await this.refreshCredentials({
        tenantId: input.tenantId,
        gatewayConfigurationId: input.gatewayConfigurationId,
        encryptedCredentials: latest.encryptedCredentials,
        credentials: latestCredentials,
      });
    } finally {
      await this.releaseLock(lockKey, lockToken);
    }
  }

  private async refreshCredentials(input: {
    tenantId: string;
    gatewayConfigurationId: string;
    encryptedCredentials: string;
    credentials: MercadoPagoCredentials;
  }): Promise<MercadoPagoCredentials> {
    const clientId = this.config.get<string>('MERCADO_PAGO_CLIENT_ID');
    const clientSecret = this.config.get<string>('MERCADO_PAGO_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      await this.markTransientRefreshFailure(input.gatewayConfigurationId);
      throw new GatewayCredentialsInvalidError('Mercado Pago OAuth variables are not configured.');
    }

    try {
      const refreshed = await this.apiClient.refreshAccessToken(
        input.credentials.refreshToken,
        clientId,
        clientSecret,
      );

      const nextCredentials: MercadoPagoCredentials = {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || input.credentials.refreshToken,
        tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        merchantId: String(refreshed.user_id || input.credentials.merchantId || ''),
        scope: refreshed.scope || input.credentials.scope,
      };

      const encrypted = JSON.stringify(this.encryptionService.encrypt(nextCredentials));
      const fingerprint = nextCredentials.merchantId
        ? MercadoPagoCredentialsMapper.deriveFingerprint(nextCredentials)
        : undefined;

      const updateResult = await this.prisma.gatewayConfiguration.updateMany({
        where: {
          id: input.gatewayConfigurationId,
          tenantId: input.tenantId,
          provider: PaymentProvider.MERCADO_PAGO,
          encryptedCredentials: input.encryptedCredentials,
        },
        data: {
          encryptedCredentials: encrypted,
          credentialsFingerprint: fingerprint,
          status: GatewayConfigurationStatus.ACTIVE,
          healthStatus: GatewayHealthStatus.HEALTHY,
          lastHealthCheckAt: new Date(),
          lastHealthCheckMessage: 'MERCADO_PAGO_TOKEN_REFRESHED',
        },
      });

      if (updateResult.count === 0) {
        const latest = await this.prisma.gatewayConfiguration.findFirstOrThrow({
          where: {
            id: input.gatewayConfigurationId,
            tenantId: input.tenantId,
            provider: PaymentProvider.MERCADO_PAGO,
          },
        });
        return this.toMercadoPagoCredentials(
          this.encryptionService.decrypt(latest.encryptedCredentials ?? ''),
        );
      }

      await this.prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          action: AuditActions.MERCADO_PAGO_TOKEN_REFRESHED,
          entityType: 'GATEWAY_CONFIGURATION',
          entityId: input.gatewayConfigurationId,
          metadata: { provider: PaymentProvider.MERCADO_PAGO },
        },
      });

      return nextCredentials;
    } catch (error: unknown) {
      if (this.isInvalidRefreshTokenError(error)) {
        await this.markReauthRequired(input.tenantId, input.gatewayConfigurationId);
        throw new GatewayCredentialsInvalidError('Mercado Pago connection requires reconnection.');
      }

      await this.markTransientRefreshFailure(input.gatewayConfigurationId);
      throw error;
    }
  }

  private async waitForFreshCredentials(
    input: {
      tenantId: string;
      gatewayConfigurationId: string;
      purpose: 'PAYMENT' | 'SETTLEMENT' | 'WEBHOOK_ENRICHMENT';
    },
    previousExpiresAt: string,
  ): Promise<MercadoPagoCredentials> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await delay(150);
      const configuration = await this.prisma.gatewayConfiguration.findFirst({
        where: {
          id: input.gatewayConfigurationId,
          tenantId: input.tenantId,
          provider: PaymentProvider.MERCADO_PAGO,
        },
      });

      if (!configuration || !configuration.encryptedCredentials) {
        throw new GatewayCredentialsInvalidError('Mercado Pago credentials are not configured.');
      }

      if (configuration.status !== GatewayConfigurationStatus.ACTIVE) {
        throw new GatewayCredentialsInvalidError('Mercado Pago connection requires reconnection.');
      }

      const credentials = this.toMercadoPagoCredentials(
        this.encryptionService.decrypt(configuration.encryptedCredentials),
      );

      if (credentials.tokenExpiresAt !== previousExpiresAt || !this.shouldRefresh(credentials)) {
        return credentials;
      }
    }

    return this.toMercadoPagoCredentials(await this.getValidCredentials(input));
  }

  private async markReauthRequired(
    tenantId: string,
    gatewayConfigurationId: string,
  ): Promise<void> {
    await this.prisma.gatewayConfiguration.update({
      where: { id: gatewayConfigurationId },
      data: {
        status: REAUTH_REQUIRED_STATUS,
        healthStatus: GatewayHealthStatus.DEGRADED,
        lastHealthCheckAt: new Date(),
        lastHealthCheckMessage: 'MERCADO_PAGO_REAUTH_REQUIRED',
      } as Prisma.GatewayConfigurationUpdateInput,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: AuditActions.MERCADO_PAGO_CONNECTION_REAUTH_REQUIRED,
        entityType: 'GATEWAY_CONFIGURATION',
        entityId: gatewayConfigurationId,
        metadata: { provider: PaymentProvider.MERCADO_PAGO },
      },
    });

    const notifications = this.moduleRef.get(NotificationProducerService, { strict: false });
    await notifications?.mercadoPagoConnectionReauthRequired({
      tenantId,
      gatewayConfigurationId,
    });
  }

  private async markTransientRefreshFailure(gatewayConfigurationId: string): Promise<void> {
    await this.prisma.gatewayConfiguration.update({
      where: { id: gatewayConfigurationId },
      data: {
        healthStatus: GatewayHealthStatus.DEGRADED,
        lastHealthCheckAt: new Date(),
        lastHealthCheckMessage: 'MERCADO_PAGO_REFRESH_TRANSIENT_FAILURE',
      },
    });
  }

  private shouldRefresh(credentials: MercadoPagoCredentials): boolean {
    const expiresAt = new Date(credentials.tokenExpiresAt).getTime();
    if (Number.isNaN(expiresAt)) return true;
    return expiresAt <= Date.now() + this.refreshThresholdMs;
  }

  private toMercadoPagoCredentials(credentials: GatewayCredentials): MercadoPagoCredentials {
    if (!credentials.accessToken || !credentials.refreshToken || !credentials.tokenExpiresAt) {
      throw new GatewayCredentialsInvalidError('Mercado Pago credentials are invalid.');
    }

    return {
      accessToken: String(credentials.accessToken),
      refreshToken: String(credentials.refreshToken),
      tokenExpiresAt: String(credentials.tokenExpiresAt),
      merchantId: credentials.merchantId ? String(credentials.merchantId) : undefined,
      scope: credentials.scope ? String(credentials.scope) : undefined,
    };
  }

  private isInvalidRefreshTokenError(error: unknown): boolean {
    return (
      error instanceof MercadoPagoApiError &&
      (error.statusCode === 400 || error.statusCode === 401)
    );
  }

  private async releaseLock(lockKey: string, lockToken: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      end
      return 0
    `;
    await this.redis.eval(script, 1, lockKey, lockToken);
  }
}

function cryptoRandomToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
