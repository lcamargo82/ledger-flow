CREATE TYPE "ReconciliationDecisionAction" AS ENUM (
  'MANUAL_MATCH',
  'RESOLVE_EXCEPTION',
  'IGNORE',
  'REOPEN',
  'COMMENT'
);

CREATE TABLE "reconciliation_decisions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "action" "ReconciliationDecisionAction" NOT NULL,
  "reason_code" TEXT NOT NULL,
  "comment" TEXT,
  "previous_status" "ReconciliationCaseStatus" NOT NULL,
  "next_status" "ReconciliationCaseStatus" NOT NULL,
  "payment_id" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reconciliation_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reconciliation_decisions_tenant_id_created_at_idx"
  ON "reconciliation_decisions"("tenant_id", "created_at");
CREATE INDEX "reconciliation_decisions_tenant_id_case_id_idx"
  ON "reconciliation_decisions"("tenant_id", "case_id");
CREATE INDEX "reconciliation_decisions_tenant_id_action_idx"
  ON "reconciliation_decisions"("tenant_id", "action");
CREATE INDEX "reconciliation_decisions_actor_user_id_idx"
  ON "reconciliation_decisions"("actor_user_id");
CREATE INDEX "reconciliation_decisions_payment_id_idx"
  ON "reconciliation_decisions"("payment_id");

ALTER TABLE "reconciliation_decisions"
  ADD CONSTRAINT "reconciliation_decisions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reconciliation_decisions"
  ADD CONSTRAINT "reconciliation_decisions_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "reconciliation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reconciliation_decisions"
  ADD CONSTRAINT "reconciliation_decisions_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reconciliation_decisions"
  ADD CONSTRAINT "reconciliation_decisions_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
