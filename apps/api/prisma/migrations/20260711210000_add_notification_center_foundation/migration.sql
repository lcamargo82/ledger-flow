CREATE TYPE "NotificationCategory" AS ENUM ('PAYMENTS', 'INVENTORY', 'CHANNELS', 'ORDERS', 'RECONCILIATION', 'SYSTEM');
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "titleKey" TEXT NOT NULL,
    "messageKey" TEXT NOT NULL,
    "translation_args_json" JSONB,
    "metadata_json" JSONB,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requiredPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requiredCapabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_recipients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "notificationEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_events_tenantId_idempotencyKey_key" ON "notification_events"("tenantId", "idempotencyKey");
CREATE INDEX "notification_events_tenantId_category_createdAt_idx" ON "notification_events"("tenantId", "category", "createdAt" DESC);
CREATE INDEX "notification_events_tenantId_sourceType_sourceId_idx" ON "notification_events"("tenantId", "sourceType", "sourceId");
CREATE UNIQUE INDEX "notification_recipients_notificationEventId_userId_key" ON "notification_recipients"("notificationEventId", "userId");
CREATE INDEX "notification_recipients_tenantId_userId_readAt_createdAt_idx" ON "notification_recipients"("tenantId", "userId", "readAt", "createdAt" DESC);
CREATE INDEX "notification_recipients_tenantId_userId_dismissedAt_createdAt_idx" ON "notification_recipients"("tenantId", "userId", "dismissedAt", "createdAt" DESC);

ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationEventId_fkey" FOREIGN KEY ("notificationEventId") REFERENCES "notification_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "description", "scope", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'notifications:manage', 'Gerenciar notificações', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "updatedAt" = CURRENT_TIMESTAMP;
