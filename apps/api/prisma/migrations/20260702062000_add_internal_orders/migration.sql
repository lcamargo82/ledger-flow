CREATE TYPE "InternalOrderStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'CANCELLED',
    'FULFILLED'
);

CREATE TABLE "internal_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "InternalOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotency_key" TEXT NOT NULL,
    "customer_name" TEXT,
    "notes" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "fulfilled_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "internal_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "internal_order_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "reservation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "internal_order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "internal_orders_tenant_id_order_number_key" ON "internal_orders"("tenant_id", "order_number");
CREATE UNIQUE INDEX "internal_orders_tenant_id_idempotency_key_key" ON "internal_orders"("tenant_id", "idempotency_key");
CREATE INDEX "internal_orders_tenant_id_status_idx" ON "internal_orders"("tenant_id", "status");
CREATE INDEX "internal_orders_tenant_id_created_at_idx" ON "internal_orders"("tenant_id", "created_at");

CREATE UNIQUE INDEX "internal_order_items_reservation_id_key" ON "internal_order_items"("reservation_id");
CREATE INDEX "internal_order_items_tenant_id_order_id_idx" ON "internal_order_items"("tenant_id", "order_id");
CREATE INDEX "internal_order_items_tenant_id_sku_id_idx" ON "internal_order_items"("tenant_id", "sku_id");
CREATE INDEX "internal_order_items_tenant_id_warehouse_id_idx" ON "internal_order_items"("tenant_id", "warehouse_id");

ALTER TABLE "internal_orders"
    ADD CONSTRAINT "internal_orders_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "internal_order_items"
    ADD CONSTRAINT "internal_order_items_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "internal_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "internal_order_items"
    ADD CONSTRAINT "internal_order_items_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "internal_order_items"
    ADD CONSTRAINT "internal_order_items_sku_id_fkey"
    FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "internal_order_items"
    ADD CONSTRAINT "internal_order_items_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "internal_order_items"
    ADD CONSTRAINT "internal_order_items_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "inventory_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
