ALTER TABLE "channel_listings"
ADD COLUMN "external_user_product_id" TEXT;

CREATE INDEX "channel_listings_tenant_id_integration_id_external_user_product_id_idx"
ON "channel_listings"("tenant_id", "integration_id", "external_user_product_id");
