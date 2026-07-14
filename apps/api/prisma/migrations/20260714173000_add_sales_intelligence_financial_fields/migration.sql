ALTER TABLE "order_financial_facts"
ADD COLUMN "payment_status" TEXT,
ADD COLUMN "paid_amount" DECIMAL(18,4),
ADD COLUMN "estimated_net_amount" DECIMAL(18,4),
ADD COLUMN "sold_at" TIMESTAMP(3),
ADD COLUMN "financial_signature" TEXT,
ADD COLUMN "is_current" BOOLEAN NOT NULL DEFAULT true;

WITH ranked_facts AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "tenant_id", "order_id"
    ORDER BY "version" DESC, "calculated_at" DESC, "created_at" DESC
  ) AS position
  FROM "order_financial_facts"
)
UPDATE "order_financial_facts" AS facts
SET "is_current" = false
FROM ranked_facts
WHERE facts."id" = ranked_facts."id"
  AND ranked_facts.position > 1;

CREATE INDEX "order_financial_facts_tenant_id_order_id_financial_signature_idx"
ON "order_financial_facts"("tenant_id", "order_id", "financial_signature");

CREATE INDEX "order_financial_facts_tenant_id_order_id_is_current_idx"
ON "order_financial_facts"("tenant_id", "order_id", "is_current");

CREATE UNIQUE INDEX "order_financial_facts_one_current_per_order_key"
ON "order_financial_facts"("tenant_id", "order_id")
WHERE "is_current" = true;

CREATE INDEX "order_facts_current_sold_at_idx"
ON "order_financial_facts"("tenant_id", "channel_provider", "is_current", "sold_at");

CREATE INDEX "order_facts_current_payment_status_idx"
ON "order_financial_facts"("tenant_id", "channel_provider", "is_current", "payment_status");
