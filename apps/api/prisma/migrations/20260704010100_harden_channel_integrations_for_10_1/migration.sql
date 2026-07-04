ALTER TYPE "ChannelIntegrationStatus" RENAME TO "ChannelIntegrationStatus_old";

CREATE TYPE "ChannelIntegrationStatus" AS ENUM (
  'INACTIVE',
  'ACTIVE',
  'DISABLED',
  'SUSPENDED',
  'REAUTH_REQUIRED'
);

ALTER TABLE "channel_integrations"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ChannelIntegrationStatus"
    USING ("status"::text::"ChannelIntegrationStatus"),
  ALTER COLUMN "status" SET DEFAULT 'INACTIVE',
  ALTER COLUMN "webhook_secret_hash" DROP NOT NULL,
  ADD COLUMN "external_account_id" TEXT,
  ADD COLUMN "display_name" TEXT,
  ADD COLUMN "encrypted_credentials" JSONB,
  ADD COLUMN "credentials_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "credentials_fingerprint" TEXT,
  ADD COLUMN "settings_json" JSONB,
  ADD COLUMN "default_warehouse_id" TEXT,
  ADD COLUMN "sync_policy_json" JSONB,
  ADD COLUMN "health_status" TEXT,
  ADD COLUMN "last_successful_operation_at" TIMESTAMP(3),
  ADD COLUMN "last_failure_at" TIMESTAMP(3);

DROP TYPE "ChannelIntegrationStatus_old";

CREATE INDEX "channel_integrations_tenant_id_provider_external_account_id_idx"
  ON "channel_integrations"("tenant_id", "provider", "external_account_id");
