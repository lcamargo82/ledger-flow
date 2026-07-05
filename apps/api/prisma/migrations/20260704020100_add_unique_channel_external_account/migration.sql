DROP INDEX IF EXISTS "channel_integrations_tenant_id_provider_external_account_id_idx";

CREATE UNIQUE INDEX "channel_integrations_tenant_id_provider_external_account_id_key"
  ON "channel_integrations"("tenant_id", "provider", "external_account_id");
