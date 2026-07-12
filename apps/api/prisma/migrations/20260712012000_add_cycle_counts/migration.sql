CREATE TYPE "CycleCountStatus" AS ENUM ('DRAFT', 'OPEN', 'COUNTED', 'APPROVED', 'CANCELED');

CREATE TABLE "cycle_counts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "count_number" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "status" "CycleCountStatus" NOT NULL DEFAULT 'DRAFT',
    "reason_code" TEXT,
    "notes" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "opened_by_user_id" TEXT,
    "approved_by_user_id" TEXT,
    "canceled_by_user_id" TEXT,
    "opened_at" TIMESTAMP(3),
    "counted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "adjusted_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_counts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cycle_count_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cycle_count_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "system_on_hand_at_open" DECIMAL(18,6),
    "balance_version_at_open" INTEGER,
    "counted_quantity" DECIMAL(18,6),
    "variance_quantity" DECIMAL(18,6),
    "counted_by_user_id" TEXT,
    "counted_at" TIMESTAMP(3),
    "adjustment_movement_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_count_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cycle_count_items_counted_quantity_non_negative_check" CHECK ("counted_quantity" IS NULL OR "counted_quantity" >= 0)
);

CREATE UNIQUE INDEX "cycle_counts_tenant_id_count_number_key" ON "cycle_counts"("tenant_id", "count_number");
CREATE UNIQUE INDEX "cycle_counts_tenant_id_idempotency_key_key" ON "cycle_counts"("tenant_id", "idempotency_key");
CREATE INDEX "cycle_counts_tenant_id_warehouse_id_status_created_at_idx" ON "cycle_counts"("tenant_id", "warehouse_id", "status", "created_at" DESC);
CREATE INDEX "cycle_counts_tenant_id_status_created_at_idx" ON "cycle_counts"("tenant_id", "status", "created_at" DESC);

CREATE UNIQUE INDEX "cycle_count_items_cycle_count_id_sku_id_key" ON "cycle_count_items"("cycle_count_id", "sku_id");
CREATE INDEX "cycle_count_items_tenant_id_sku_id_idx" ON "cycle_count_items"("tenant_id", "sku_id");
CREATE INDEX "cycle_count_items_tenant_id_cycle_count_id_idx" ON "cycle_count_items"("tenant_id", "cycle_count_id");

ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_canceled_by_user_id_fkey" FOREIGN KEY ("canceled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_cycle_count_id_fkey" FOREIGN KEY ("cycle_count_id") REFERENCES "cycle_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_counted_by_user_id_fkey" FOREIGN KEY ("counted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_adjustment_movement_id_fkey" FOREIGN KEY ("adjustment_movement_id") REFERENCES "inventory_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
