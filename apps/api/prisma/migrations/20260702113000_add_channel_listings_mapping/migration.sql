-- CreateEnum
CREATE TYPE "ChannelListingMatchStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'AMBIGUOUS', 'IGNORED');

-- CreateTable
CREATE TABLE "channel_listings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "external_listing_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "external_sku" TEXT,
    "match_status" "ChannelListingMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matched_sku_id" TEXT,
    "candidate_sku_ids" JSONB,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ignored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_sku_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "mapped_by_user_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_sku_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_listings_tenant_id_integration_id_external_listing_id_key" ON "channel_listings"("tenant_id", "integration_id", "external_listing_id");

-- CreateIndex
CREATE INDEX "channel_listings_tenant_id_match_status_idx" ON "channel_listings"("tenant_id", "match_status");

-- CreateIndex
CREATE INDEX "channel_listings_tenant_id_integration_id_idx" ON "channel_listings"("tenant_id", "integration_id");

-- CreateIndex
CREATE INDEX "channel_listings_tenant_id_external_sku_idx" ON "channel_listings"("tenant_id", "external_sku");

-- CreateIndex
CREATE UNIQUE INDEX "listing_sku_mappings_tenant_id_listing_id_key" ON "listing_sku_mappings"("tenant_id", "listing_id");

-- CreateIndex
CREATE INDEX "listing_sku_mappings_tenant_id_sku_id_idx" ON "listing_sku_mappings"("tenant_id", "sku_id");

-- AddForeignKey
ALTER TABLE "channel_listings" ADD CONSTRAINT "channel_listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_listings" ADD CONSTRAINT "channel_listings_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "channel_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_listings" ADD CONSTRAINT "channel_listings_matched_sku_id_fkey" FOREIGN KEY ("matched_sku_id") REFERENCES "product_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_sku_mappings" ADD CONSTRAINT "listing_sku_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_sku_mappings" ADD CONSTRAINT "listing_sku_mappings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "channel_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_sku_mappings" ADD CONSTRAINT "listing_sku_mappings_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
