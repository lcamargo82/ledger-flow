CREATE TABLE "provider_settlement_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "provider" "WebhookProvider" NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "provider_settlement_id" TEXT,
    "provider_payment_id" TEXT,
    "external_reference" TEXT,
    "event_type" TEXT NOT NULL,
    "provider_status" TEXT,
    "amount_minor" DECIMAL(18,0),
    "fee_amount_minor" DECIMAL(18,0),
    "net_amount_minor" DECIMAL(18,0),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "currency_exponent" INTEGER NOT NULL DEFAULT 2,
    "occurred_at" TIMESTAMP(3),
    "available_at" TIMESTAMP(3),
    "payload_hash" TEXT NOT NULL,
    "normalized_payload" JSONB,
    "source_webhook_inbox_event_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_settlement_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_settlement_events_provider_provider_event_id_key"
    ON "provider_settlement_events"("provider", "provider_event_id");

CREATE UNIQUE INDEX "provider_settlement_events_provider_provider_settlement_id_key"
    ON "provider_settlement_events"("provider", "provider_settlement_id")
    WHERE "provider_settlement_id" IS NOT NULL;

CREATE INDEX "provider_settlement_events_provider_provider_settlement_id_idx"
    ON "provider_settlement_events"("provider", "provider_settlement_id");

CREATE INDEX "provider_settlement_events_provider_provider_payment_id_idx"
    ON "provider_settlement_events"("provider", "provider_payment_id");

CREATE INDEX "provider_settlement_events_provider_external_reference_idx"
    ON "provider_settlement_events"("provider", "external_reference");

CREATE INDEX "provider_settlement_events_tenant_id_provider_occurred_at_idx"
    ON "provider_settlement_events"("tenant_id", "provider", "occurred_at");

CREATE INDEX "provider_settlement_events_source_webhook_inbox_event_id_idx"
    ON "provider_settlement_events"("source_webhook_inbox_event_id");

ALTER TABLE "provider_settlement_events"
    ADD CONSTRAINT "provider_settlement_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "provider_settlement_events"
    ADD CONSTRAINT "provider_settlement_events_source_webhook_inbox_event_id_fkey"
    FOREIGN KEY ("source_webhook_inbox_event_id") REFERENCES "webhook_inbox_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
