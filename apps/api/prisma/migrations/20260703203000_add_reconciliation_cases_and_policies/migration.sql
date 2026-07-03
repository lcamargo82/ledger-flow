CREATE TYPE "ReconciliationCaseStatus" AS ENUM (
    'PENDING',
    'AUTO_MATCHED',
    'MANUALLY_MATCHED',
    'RECONCILED',
    'UNMATCHED',
    'AMBIGUOUS',
    'AMOUNT_DIVERGENCE',
    'CURRENCY_DIVERGENCE',
    'STATUS_DIVERGENCE',
    'IGNORED',
    'RESOLVED_EXCEPTION'
);

CREATE TYPE "ReconciliationMatchType" AS ENUM (
    'PROVIDER_PAYMENT_ID',
    'EXTERNAL_REFERENCE',
    'EXPLICIT_LINK',
    'AMOUNT_CURRENCY_TIME_CANDIDATE',
    'NONE'
);

CREATE TABLE "reconciliation_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "status" "ReconciliationCaseStatus" NOT NULL DEFAULT 'PENDING',
    "match_type" "ReconciliationMatchType" NOT NULL DEFAULT 'NONE',
    "settlement_event_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "order_id" TEXT,
    "expected_amount_minor" DECIMAL(18,0),
    "received_amount_minor" DECIMAL(18,0),
    "difference_amount_minor" DECIMAL(18,0),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "currency_exponent" INTEGER NOT NULL DEFAULT 2,
    "policy_version" INTEGER NOT NULL DEFAULT 1,
    "matched_at" TIMESTAMP(3),
    "reconciled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reconciliation_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "WebhookProvider",
    "currency" TEXT NOT NULL,
    "currency_exponent" INTEGER NOT NULL DEFAULT 2,
    "amount_tolerance_minor" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reconciliation_cases_tenant_id_settlement_event_id_key"
    ON "reconciliation_cases"("tenant_id", "settlement_event_id");

CREATE INDEX "reconciliation_cases_tenant_id_status_idx"
    ON "reconciliation_cases"("tenant_id", "status");

CREATE INDEX "reconciliation_cases_tenant_id_provider_created_at_idx"
    ON "reconciliation_cases"("tenant_id", "provider", "created_at");

CREATE INDEX "reconciliation_cases_payment_id_idx"
    ON "reconciliation_cases"("payment_id");

CREATE UNIQUE INDEX "reconciliation_policies_tenant_id_provider_currency_version_key"
    ON "reconciliation_policies"("tenant_id", "provider", "currency", "version");

CREATE INDEX "reconciliation_policies_tenant_id_provider_currency_is_active_idx"
    ON "reconciliation_policies"("tenant_id", "provider", "currency", "is_active");

ALTER TABLE "reconciliation_cases"
    ADD CONSTRAINT "reconciliation_cases_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reconciliation_cases"
    ADD CONSTRAINT "reconciliation_cases_settlement_event_id_fkey"
    FOREIGN KEY ("settlement_event_id") REFERENCES "provider_settlement_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reconciliation_cases"
    ADD CONSTRAINT "reconciliation_cases_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reconciliation_policies"
    ADD CONSTRAINT "reconciliation_policies_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
