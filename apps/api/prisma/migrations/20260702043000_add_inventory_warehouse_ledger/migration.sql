CREATE TYPE "InventoryMovementType" AS ENUM (
    'RECEIPT',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'RESERVATION',
    'RESERVATION_RELEASE',
    'FULFILLMENT',
    'RETURN',
    'TRANSFER_OUT',
    'TRANSFER_IN'
);

CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity_delta" DECIMAL(18,6) NOT NULL,
    "unit_cost" DECIMAL(18,4),
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "reason_code" TEXT,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_balances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "on_hand_quantity" DECIMAL(18,6) NOT NULL,
    "reserved_quantity" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "available_quantity" DECIMAL(18,6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "warehouses_tenant_id_code_key" ON "warehouses"("tenant_id", "code");
CREATE INDEX "warehouses_tenant_id_idx" ON "warehouses"("tenant_id");
CREATE INDEX "warehouses_tenant_id_is_active_idx" ON "warehouses"("tenant_id", "is_active");

CREATE UNIQUE INDEX "inventory_movements_tenant_id_idempotency_key_key" ON "inventory_movements"("tenant_id", "idempotency_key");
CREATE INDEX "inventory_movements_tenant_id_sku_id_warehouse_id_occurred_at_idx" ON "inventory_movements"("tenant_id", "sku_id", "warehouse_id", "occurred_at");
CREATE INDEX "inventory_movements_tenant_id_source_type_source_id_idx" ON "inventory_movements"("tenant_id", "source_type", "source_id");
CREATE INDEX "inventory_movements_tenant_id_occurred_at_idx" ON "inventory_movements"("tenant_id", "occurred_at");

CREATE UNIQUE INDEX "inventory_balances_tenant_id_sku_id_warehouse_id_key" ON "inventory_balances"("tenant_id", "sku_id", "warehouse_id");
CREATE INDEX "inventory_balances_tenant_id_sku_id_idx" ON "inventory_balances"("tenant_id", "sku_id");
CREATE INDEX "inventory_balances_tenant_id_warehouse_id_idx" ON "inventory_balances"("tenant_id", "warehouse_id");

ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "tenant_subscriptions" (
    "id",
    "tenantId",
    "plan",
    "status",
    "currentPeriodStart",
    "currentPeriodEnd",
    "notes",
    "createdAt",
    "updatedAt"
)
SELECT
    'platform-master-subscription',
    "id",
    'ENTERPRISE',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    'Platform tenant receives MASTER Commerce capabilities for internal validation.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tenants"
WHERE "slug" = 'ledgerflow-platform'
ON CONFLICT ("tenantId") DO UPDATE SET
    "plan" = 'ENTERPRISE',
    "status" = 'ACTIVE',
    "updatedAt" = CURRENT_TIMESTAMP;
