import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationWebhookSubscription,
  NotificationWebhookSubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CreateNotificationWebhookSubscriptionDto,
  NotificationWebhookSubscriptionResponseDto,
  UpdateNotificationWebhookSubscriptionDto,
} from '../dto/notification-webhook-subscription.dto';
import { isRegisteredNotificationEventType } from '../../domain/constants/notification-event-registry';
import { NotificationWebhookEndpointPolicyService } from './notification-webhook-endpoint-policy.service';
import { NotificationWebhookSecretService } from './notification-webhook-secret.service';

@Injectable()
export class NotificationWebhookSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly endpointPolicy: NotificationWebhookEndpointPolicyService,
    private readonly secrets: NotificationWebhookSecretService,
  ) {}

  async list(tenantId: string) {
    const subscriptions = await this.prisma.notificationWebhookSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return subscriptions.map((subscription) => this.sanitize(subscription));
  }

  async create(tenantId: string, userId: string, dto: CreateNotificationWebhookSubscriptionDto) {
    this.assertRegisteredEventTypes(dto.eventTypes);
    const endpointUrl = await this.endpointPolicy.assertSafe(dto.endpointUrl);
    const secret = this.secrets.generate();

    try {
      const subscription = await this.prisma.notificationWebhookSubscription.create({
        data: {
          tenantId,
          createdByUserId: userId,
          name: dto.name.trim(),
          endpointUrl,
          eventTypes: dto.eventTypes,
          encryptedSecretJson: secret.encryptedSecretJson,
          secretFingerprint: secret.fingerprint,
        },
      });
      return { subscription: this.sanitize(subscription), secret: secret.plaintext };
    } catch (error) {
      this.rethrowKnownPersistenceError(error);
    }
  }

  async update(tenantId: string, id: string, dto: UpdateNotificationWebhookSubscriptionDto) {
    await this.findTenantSubscription(tenantId, id);
    if (dto.eventTypes) this.assertRegisteredEventTypes(dto.eventTypes);
    const endpointUrl = dto.endpointUrl
      ? await this.endpointPolicy.assertSafe(dto.endpointUrl)
      : undefined;

    try {
      const subscription = await this.prisma.notificationWebhookSubscription.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(endpointUrl !== undefined && { endpointUrl }),
          ...(dto.eventTypes !== undefined && { eventTypes: dto.eventTypes }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
      });
      return this.sanitize(subscription);
    } catch (error) {
      this.rethrowKnownPersistenceError(error);
    }
  }

  async disable(tenantId: string, id: string): Promise<void> {
    await this.findTenantSubscription(tenantId, id);
    await this.prisma.notificationWebhookSubscription.update({
      where: { id },
      data: { status: NotificationWebhookSubscriptionStatus.DISABLED },
    });
  }

  async rotateSecret(tenantId: string, id: string) {
    await this.findTenantSubscription(tenantId, id);
    const secret = this.secrets.generate();
    const subscription = await this.prisma.notificationWebhookSubscription.update({
      where: { id },
      data: {
        encryptedSecretJson: secret.encryptedSecretJson,
        secretFingerprint: secret.fingerprint,
      },
    });
    return { subscription: this.sanitize(subscription), secret: secret.plaintext };
  }

  private async findTenantSubscription(tenantId: string, id: string) {
    const subscription = await this.prisma.notificationWebhookSubscription.findFirst({
      where: { id, tenantId },
    });
    if (!subscription) throw new NotFoundException('Webhook subscription not found.');
    return subscription;
  }

  private assertRegisteredEventTypes(eventTypes: string[]) {
    const invalid = eventTypes.filter((eventType) => !isRegisteredNotificationEventType(eventType));
    if (invalid.length) {
      throw new BadRequestException(`Unsupported notification event types: ${invalid.join(', ')}`);
    }
  }

  private sanitize(
    subscription: NotificationWebhookSubscription,
  ): NotificationWebhookSubscriptionResponseDto {
    return {
      id: subscription.id,
      name: subscription.name,
      endpointUrl: subscription.endpointUrl,
      status: subscription.status,
      eventTypes: subscription.eventTypes,
      secretFingerprintSuffix: subscription.secretFingerprint.slice(-8),
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  private rethrowKnownPersistenceError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A webhook subscription already uses this endpoint.');
    }
    throw error;
  }
}
