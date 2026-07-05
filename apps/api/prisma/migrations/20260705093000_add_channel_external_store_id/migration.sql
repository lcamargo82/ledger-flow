ALTER TABLE "channel_integrations"
  ADD COLUMN "external_store_id" TEXT;

CREATE INDEX "channel_integrations_tenant_id_provider_external_store_id_idx"
  ON "channel_integrations"("tenant_id", "provider", "external_store_id");
