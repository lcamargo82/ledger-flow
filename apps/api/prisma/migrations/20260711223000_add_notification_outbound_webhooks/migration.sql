CREATE TYPE "NotificationWebhookSubscriptionStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "NotificationWebhookDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'RETRY_SCHEDULED', 'DLQ', 'CANCELED');

CREATE TABLE "notification_webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "status" "NotificationWebhookSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "eventTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "encrypted_secret_json" JSONB NOT NULL,
    "secret_fingerprint" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "notification_event_id" TEXT NOT NULL,
    "status" "NotificationWebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 8,
    "next_attempt_at" TIMESTAMP(3),
    "last_attempt_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "response_status_code" INTEGER,
    "error_code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_webhook_subscriptions_tenantId_endpointUrl_key" ON "notification_webhook_subscriptions"("tenantId", "endpointUrl");
CREATE INDEX "notification_webhook_subscriptions_tenantId_status_createdAt_idx" ON "notification_webhook_subscriptions"("tenantId", "status", "createdAt" DESC);
CREATE UNIQUE INDEX "notification_webhook_deliveries_tenantId_idempotency_key_key" ON "notification_webhook_deliveries"("tenantId", "idempotency_key");
CREATE UNIQUE INDEX "notification_webhook_deliveries_subscription_id_notification_event_id_key" ON "notification_webhook_deliveries"("subscription_id", "notification_event_id");
CREATE INDEX "notification_webhook_deliveries_tenantId_status_next_attempt_at_createdAt_idx" ON "notification_webhook_deliveries"("tenantId", "status", "next_attempt_at", "createdAt");
CREATE INDEX "notification_webhook_deliveries_subscription_id_status_createdAt_idx" ON "notification_webhook_deliveries"("subscription_id", "status", "createdAt" DESC);

ALTER TABLE "notification_webhook_subscriptions" ADD CONSTRAINT "notification_webhook_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_webhook_subscriptions" ADD CONSTRAINT "notification_webhook_subscriptions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_webhook_deliveries" ADD CONSTRAINT "notification_webhook_deliveries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_webhook_deliveries" ADD CONSTRAINT "notification_webhook_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "notification_webhook_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_webhook_deliveries" ADD CONSTRAINT "notification_webhook_deliveries_notification_event_id_fkey" FOREIGN KEY ("notification_event_id") REFERENCES "notification_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
