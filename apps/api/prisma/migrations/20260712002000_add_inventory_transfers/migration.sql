CREATE TYPE "InventoryTransferStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELED');

CREATE TABLE "inventory_transfers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "source_warehouse_id" TEXT NOT NULL,
    "destination_warehouse_id" TEXT NOT NULL,
    "status" "InventoryTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "reason_code" TEXT NOT NULL,
    "notes" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "completed_by_user_id" TEXT,
    "canceled_by_user_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_transfers_distinct_warehouses_check" CHECK ("source_warehouse_id" <> "destination_warehouse_id")
);

CREATE TABLE "inventory_transfer_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit_cost_snapshot" DECIMAL(18,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transfer_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_transfer_items_positive_quantity_check" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "inventory_transfers_tenant_id_transfer_number_key" ON "inventory_transfers"("tenant_id", "transfer_number");
CREATE UNIQUE INDEX "inventory_transfers_tenant_id_idempotency_key_key" ON "inventory_transfers"("tenant_id", "idempotency_key");
CREATE INDEX "inventory_transfers_tenant_id_status_created_at_idx" ON "inventory_transfers"("tenant_id", "status", "created_at" DESC);
CREATE INDEX "inventory_transfers_tenant_id_source_warehouse_id_idx" ON "inventory_transfers"("tenant_id", "source_warehouse_id");
CREATE INDEX "inventory_transfers_tenant_id_destination_warehouse_id_idx" ON "inventory_transfers"("tenant_id", "destination_warehouse_id");

CREATE UNIQUE INDEX "inventory_transfer_items_transfer_id_sku_id_key" ON "inventory_transfer_items"("transfer_id", "sku_id");
CREATE INDEX "inventory_transfer_items_tenant_id_sku_id_idx" ON "inventory_transfer_items"("tenant_id", "sku_id");
CREATE INDEX "inventory_transfer_items_tenant_id_transfer_id_idx" ON "inventory_transfer_items"("tenant_id", "transfer_id");

ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_source_warehouse_id_fkey" FOREIGN KEY ("source_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_destination_warehouse_id_fkey" FOREIGN KEY ("destination_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_canceled_by_user_id_fkey" FOREIGN KEY ("canceled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "inventory_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
