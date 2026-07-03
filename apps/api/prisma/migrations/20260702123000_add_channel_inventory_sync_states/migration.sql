-- CreateEnum
CREATE TYPE "ChannelInventorySyncStatus" AS ENUM ('PENDING', 'SYNCED', 'RETRY_SCHEDULED', 'CIRCUIT_OPEN', 'FAILED');

-- CreateEnum
CREATE TYPE "ChannelCircuitState" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- CreateTable
CREATE TABLE "channel_inventory_sync_states" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "external_listing_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "status" "ChannelInventorySyncStatus" NOT NULL DEFAULT 'PENDING',
    "circuit_state" "ChannelCircuitState" NOT NULL DEFAULT 'CLOSED',
    "target_available_quantity" DECIMAL(18,6) NOT NULL,
    "last_synced_quantity" DECIMAL(18,6),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    "circuit_opened_until" TIMESTAMP(3),
    "last_error_code" TEXT,
    "last_error_summary" TEXT,
    "last_requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_inventory_sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_inventory_sync_states_listing_id_key" ON "channel_inventory_sync_states"("listing_id");

-- CreateIndex
CREATE INDEX "channel_inventory_sync_states_tenant_id_status_idx" ON "channel_inventory_sync_states"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "channel_inventory_sync_states_tenant_id_provider_idx" ON "channel_inventory_sync_states"("tenant_id", "provider");

-- CreateIndex
CREATE INDEX "channel_inventory_sync_states_integration_id_status_idx" ON "channel_inventory_sync_states"("integration_id", "status");

-- CreateIndex
CREATE INDEX "channel_inventory_sync_states_next_attempt_at_idx" ON "channel_inventory_sync_states"("next_attempt_at");

-- AddForeignKey
ALTER TABLE "channel_inventory_sync_states" ADD CONSTRAINT "channel_inventory_sync_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_inventory_sync_states" ADD CONSTRAINT "channel_inventory_sync_states_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "channel_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
