import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationWebhookDeliveryStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { NotificationWebhookEndpointPolicyService } from './notification-webhook-endpoint-policy.service';
import { NotificationWebhookSecretService } from './notification-webhook-secret.service';
import { NotificationWebhookSignerService } from './notification-webhook-signer.service';

@Injectable()
export class NotificationWebhookDeliveryExecutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly endpointPolicy: NotificationWebhookEndpointPolicyService,
    private readonly secrets: NotificationWebhookSecretService,
    private readonly signer: NotificationWebhookSignerService,
    private readonly config: ConfigService,
  ) {}

  async execute(deliveryId: string, expectedAttempt: number): Promise<void> {
    const delivery = await this.loadDelivery(deliveryId);
    if (!delivery || this.shouldSkip(delivery.status, delivery.attemptCount, expectedAttempt))
      return;

    if (delivery.subscription.status !== 'ACTIVE') {
      await this.cancel(delivery.id);
      return;
    }

    const attempt = expectedAttempt;
    const claimed =
      delivery.status === NotificationWebhookDeliveryStatus.PROCESSING &&
      delivery.attemptCount === expectedAttempt
        ? true
        : await this.markProcessing(delivery.id, expectedAttempt);
    if (!claimed) return;

    let endpointUrl: string;
    let secret: string;
    try {
      endpointUrl = await this.endpointPolicy.assertSafe(delivery.subscription.endpointUrl);
      secret = this.secrets.decrypt(delivery.subscription.encryptedSecretJson);
    } catch {
      await this.moveToDlq(delivery.id, null, 'ENDPOINT_OR_SECRET_INVALID');
      return;
    }

    const rawBody = this.serializeEvent(delivery.notificationEvent);
    const signature = this.signer.sign(rawBody, secret);
    const response = await this.send(
      endpointUrl,
      rawBody,
      delivery.id,
      delivery.idempotencyKey,
      signature,
    );

    if (response.ok) {
      await this.markDelivered(delivery.id, response.status);
      return;
    }

    const errorCode = response.status ? `HTTP_${response.status}` : response.errorCode;
    if (this.isRetryable(response.status) && attempt < delivery.maxAttempts) {
      await this.scheduleRetry(delivery, attempt, response.status, errorCode);
      return;
    }

    await this.moveToDlq(delivery.id, response.status, errorCode);
  }

  private loadDelivery(deliveryId: string) {
    return this.prisma.notificationWebhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { subscription: true, notificationEvent: true },
    });
  }

  private shouldSkip(
    status: NotificationWebhookDeliveryStatus,
    attempts: number,
    expected: number,
  ) {
    return (
      attempts > expected ||
      (attempts === expected && status !== NotificationWebhookDeliveryStatus.PROCESSING) ||
      status === NotificationWebhookDeliveryStatus.DELIVERED ||
      status === NotificationWebhookDeliveryStatus.DLQ ||
      status === NotificationWebhookDeliveryStatus.CANCELED
    );
  }

  private serializeEvent(event: {
    id: string;
    eventType: string;
    category: string;
    severity: string;
    occurredAt: Date;
    sourceType: string;
    sourceId: string | null;
    translationArgsJson: Prisma.JsonValue | null;
  }) {
    return JSON.stringify({
      id: event.id,
      type: event.eventType,
      category: event.category,
      severity: event.severity,
      occurredAt: event.occurredAt.toISOString(),
      source: { type: event.sourceType, id: event.sourceId },
      data: event.translationArgsJson ?? {},
    });
  }

  private async send(
    endpointUrl: string,
    rawBody: string,
    deliveryId: string,
    idempotencyKey: string,
    signature: { timestamp: string; signature: string },
  ): Promise<
    | { ok: true; status: number; errorCode: string }
    | { ok: false; status: number | null; errorCode: string }
  > {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        redirect: 'error',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LedgerFlow-Webhook/1.0',
          'Idempotency-Key': idempotencyKey,
          'X-LedgerFlow-Delivery-Id': deliveryId,
          'X-LedgerFlow-Timestamp': signature.timestamp,
          'X-LedgerFlow-Signature': signature.signature,
        },
        body: rawBody,
      });
      if (response.ok) {
        return { ok: true, status: response.status, errorCode: `HTTP_${response.status}` };
      }
      return { ok: false, status: response.status, errorCode: `HTTP_${response.status}` };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      return { ok: false, status: null, errorCode: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR' };
    } finally {
      clearTimeout(timeout);
    }
  }

  private timeoutMs() {
    return Number(this.config.get<number>('NOTIFICATION_WEBHOOK_TIMEOUT_MS') ?? 10_000);
  }

  private isRetryable(status: number | null) {
    return status === null || status === 408 || status === 425 || status === 429 || status >= 500;
  }

  private retryAt(attempt: number) {
    const baseMs = Number(this.config.get<number>('NOTIFICATION_WEBHOOK_RETRY_BASE_MS') ?? 30_000);
    const maximumMs = Number(
      this.config.get<number>('NOTIFICATION_WEBHOOK_RETRY_MAX_MS') ?? 1_800_000,
    );
    const exponentialMs = Math.min(maximumMs, baseMs * 2 ** (attempt - 1));
    return new Date(Date.now() + Math.round(exponentialMs * (0.8 + Math.random() * 0.4)));
  }

  private async markProcessing(id: string, expectedAttempt: number) {
    const result = await this.prisma.notificationWebhookDelivery.updateMany({
      where: {
        id,
        attemptCount: expectedAttempt - 1,
        status: {
          in: [
            NotificationWebhookDeliveryStatus.PENDING,
            NotificationWebhookDeliveryStatus.RETRY_SCHEDULED,
          ],
        },
      },
      data: {
        status: NotificationWebhookDeliveryStatus.PROCESSING,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
    return result.count === 1;
  }

  private markDelivered(id: string, status: number) {
    return this.prisma.notificationWebhookDelivery.update({
      where: { id },
      data: {
        status: NotificationWebhookDeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        responseStatusCode: status,
        errorCode: null,
        nextAttemptAt: null,
      },
    });
  }

  private cancel(id: string) {
    return this.prisma.notificationWebhookDelivery.update({
      where: { id },
      data: { status: NotificationWebhookDeliveryStatus.CANCELED, nextAttemptAt: null },
    });
  }

  private moveToDlq(id: string, status: number | null, errorCode: string) {
    return this.prisma.notificationWebhookDelivery.update({
      where: { id },
      data: {
        status: NotificationWebhookDeliveryStatus.DLQ,
        responseStatusCode: status,
        errorCode,
        nextAttemptAt: null,
      },
    });
  }

  private async scheduleRetry(
    delivery: { id: string; tenantId: string },
    attempt: number,
    status: number | null,
    errorCode: string,
  ) {
    const nextAttemptAt = this.retryAt(attempt);
    const payload = { deliveryId: delivery.id, attempt: attempt + 1 };
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    await this.prisma.$transaction(async (transaction) => {
      await transaction.notificationWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationWebhookDeliveryStatus.RETRY_SCHEDULED,
          responseStatusCode: status,
          errorCode,
          nextAttemptAt,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          tenantId: delivery.tenantId,
          aggregateType: 'NotificationWebhookDelivery',
          aggregateId: delivery.id,
          eventType: 'notification.webhook.delivery_requested',
          eventVersion: 1,
          payload,
          payloadHash,
          availableAt: nextAttemptAt,
        },
      });
    });
  }
}
