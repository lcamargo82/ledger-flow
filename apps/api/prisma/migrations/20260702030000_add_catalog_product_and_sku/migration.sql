CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'PARENT', 'VARIANT');

CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "parent_product_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "attributes_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_skus" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku_canonical" TEXT NOT NULL,
    "sku_display" TEXT NOT NULL,
    "barcode" TEXT,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'UN',
    "cost_policy" TEXT NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    "average_cost" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_skus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_skus_product_id_key" ON "product_skus"("product_id");
CREATE UNIQUE INDEX "product_skus_tenant_id_sku_canonical_key" ON "product_skus"("tenant_id", "sku_canonical");
CREATE INDEX "products_tenant_id_status_idx" ON "products"("tenant_id", "status");
CREATE INDEX "products_tenant_id_type_idx" ON "products"("tenant_id", "type");
CREATE INDEX "products_tenant_id_parent_product_id_idx" ON "products"("tenant_id", "parent_product_id");
CREATE INDEX "products_tenant_id_name_idx" ON "products"("tenant_id", "name");
CREATE INDEX "product_skus_tenant_id_barcode_idx" ON "product_skus"("tenant_id", "barcode");

ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_parent_product_id_fkey" FOREIGN KEY ("parent_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_skus" ADD CONSTRAINT "product_skus_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_skus" ADD CONSTRAINT "product_skus_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
