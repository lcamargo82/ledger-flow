ALTER TABLE "order_financial_facts"
ADD COLUMN "external_order_id" TEXT;

UPDATE "order_financial_facts"
SET "external_order_id" = "components_json"->>'externalOrderId'
WHERE "components_json" ? 'externalOrderId';

CREATE INDEX "order_financial_facts_tenant_id_channel_provider_external_order_id_idx"
ON "order_financial_facts"("tenant_id", "channel_provider", "external_order_id");

ALTER TYPE "ReconciliationMatchType" ADD VALUE IF NOT EXISTS 'MARKETPLACE_ORDER_ID';

ALTER TABLE "reconciliation_cases"
ADD CONSTRAINT "reconciliation_cases_order_id_fkey"
FOREIGN KEY ("order_id")
REFERENCES "internal_orders"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "reconciliation_cases_order_id_idx"
ON "reconciliation_cases"("order_id");
