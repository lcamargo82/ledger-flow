CREATE TYPE "InventoryReservationStatus" AS ENUM (
    'ACTIVE',
    'RELEASED',
    'CONSUMED'
);

CREATE TABLE "inventory_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "released_at" TIMESTAMP(3),
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_reservations_tenant_id_source_type_source_id_key" ON "inventory_reservations"("tenant_id", "source_type", "source_id");
CREATE UNIQUE INDEX "inventory_reservations_tenant_id_idempotency_key_key" ON "inventory_reservations"("tenant_id", "idempotency_key");
CREATE INDEX "inventory_reservations_tenant_id_sku_id_warehouse_id_status_idx" ON "inventory_reservations"("tenant_id", "sku_id", "warehouse_id", "status");
CREATE INDEX "inventory_reservations_tenant_id_status_idx" ON "inventory_reservations"("tenant_id", "status");

ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
