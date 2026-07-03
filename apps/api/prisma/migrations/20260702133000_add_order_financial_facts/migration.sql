-- CreateTable
CREATE TABLE "order_financial_facts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "order_number" TEXT NOT NULL,
    "order_status" "InternalOrderStatus" NOT NULL,
    "channel_provider" "ChannelProvider",
    "revenue_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cogs_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "channel_fee_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "gross_margin_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "fulfilled_at" TIMESTAMP(3),
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "components_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_financial_facts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_financial_facts_tenant_id_order_id_version_key" ON "order_financial_facts"("tenant_id", "order_id", "version");

-- CreateIndex
CREATE INDEX "order_financial_facts_tenant_id_calculated_at_idx" ON "order_financial_facts"("tenant_id", "calculated_at");

-- CreateIndex
CREATE INDEX "order_financial_facts_tenant_id_channel_provider_calculated_at_idx" ON "order_financial_facts"("tenant_id", "channel_provider", "calculated_at");

-- CreateIndex
CREATE INDEX "order_financial_facts_tenant_id_order_status_idx" ON "order_financial_facts"("tenant_id", "order_status");

-- AddForeignKey
ALTER TABLE "order_financial_facts" ADD CONSTRAINT "order_financial_facts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_financial_facts" ADD CONSTRAINT "order_financial_facts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "internal_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
