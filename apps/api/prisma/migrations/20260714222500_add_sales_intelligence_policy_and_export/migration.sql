ALTER TYPE "ExportJobType" ADD VALUE IF NOT EXISTS 'SALES_INTELLIGENCE';

CREATE TABLE "sales_intelligence_policies" (
  "tenant_id" UUID NOT NULL,
  "low_margin_enabled" BOOLEAN NOT NULL DEFAULT true,
  "low_margin_threshold" DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_intelligence_policies_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "sales_intelligence_policies_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
