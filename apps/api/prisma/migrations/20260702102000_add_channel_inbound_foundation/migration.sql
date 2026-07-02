CREATE TYPE "ChannelProvider" AS ENUM (
    'MOCK',
    'MERCADO_LIVRE'
);

CREATE TYPE "ChannelIntegrationStatus" AS ENUM (
    'ACTIVE',
    'DISABLED'
);

CREATE TYPE "ChannelWebhookStatus" AS ENUM (
    'RECEIVED',
    'DUPLICATE',
    'INVALID',
    'DLQ'
);

CREATE TABLE "channel_integrations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ChannelIntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "webhook_secret_hash" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "channel_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "channel_webhook_inbox_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "ChannelWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload_hash" TEXT NOT NULL,
    "payload_summary" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "channel_webhook_inbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "channel_integrations_tenant_id_provider_name_key" ON "channel_integrations"("tenant_id", "provider", "name");
CREATE INDEX "channel_integrations_tenant_id_provider_status_idx" ON "channel_integrations"("tenant_id", "provider", "status");
CREATE INDEX "channel_integrations_provider_webhook_secret_hash_idx" ON "channel_integrations"("provider", "webhook_secret_hash");

CREATE UNIQUE INDEX "channel_webhook_inbox_events_provider_provider_event_id_key" ON "channel_webhook_inbox_events"("provider", "provider_event_id");
CREATE INDEX "channel_webhook_inbox_events_tenant_id_status_idx" ON "channel_webhook_inbox_events"("tenant_id", "status");
CREATE INDEX "channel_webhook_inbox_events_tenant_id_provider_idx" ON "channel_webhook_inbox_events"("tenant_id", "provider");
CREATE INDEX "channel_webhook_inbox_events_integration_id_idx" ON "channel_webhook_inbox_events"("integration_id");
CREATE INDEX "channel_webhook_inbox_events_received_at_idx" ON "channel_webhook_inbox_events"("received_at");

ALTER TABLE "channel_integrations"
    ADD CONSTRAINT "channel_integrations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "channel_webhook_inbox_events"
    ADD CONSTRAINT "channel_webhook_inbox_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "channel_webhook_inbox_events"
    ADD CONSTRAINT "channel_webhook_inbox_events_integration_id_fkey"
    FOREIGN KEY ("integration_id") REFERENCES "channel_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
