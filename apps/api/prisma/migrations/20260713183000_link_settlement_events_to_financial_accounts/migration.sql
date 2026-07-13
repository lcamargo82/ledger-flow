ALTER TABLE "provider_settlement_events"
ADD COLUMN "operational_financial_account_id" TEXT;

ALTER TABLE "provider_settlement_events"
ADD CONSTRAINT "provider_settlement_events_operational_financial_account_id_fkey"
FOREIGN KEY ("operational_financial_account_id")
REFERENCES "operational_financial_accounts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "provider_settlement_events_operational_financial_account_id_occurred_at_idx"
ON "provider_settlement_events"("operational_financial_account_id", "occurred_at");
