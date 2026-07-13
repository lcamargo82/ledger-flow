-- CreateTable
CREATE TABLE "order_shipping_summaries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "external_shipment_id" TEXT,
    "status" TEXT,
    "substatus" TEXT,
    "shipping_mode" TEXT,
    "logistic_type" TEXT,
    "handling_estimate_at" TIMESTAMP(3),
    "delivery_estimate_at" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3),
    "tracking_code_masked" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MERCADO_LIVRE_ORDER',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "last_synced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_shipping_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_shipping_summaries_tenant_id_order_id_provider_key" ON "order_shipping_summaries"("tenant_id", "order_id", "provider");

-- CreateIndex
CREATE INDEX "order_shipping_summaries_tenant_id_provider_last_synced_at_idx" ON "order_shipping_summaries"("tenant_id", "provider", "last_synced_at");

-- CreateIndex
CREATE INDEX "order_shipping_summaries_tenant_id_external_shipment_id_idx" ON "order_shipping_summaries"("tenant_id", "external_shipment_id");

-- AddForeignKey
ALTER TABLE "order_shipping_summaries" ADD CONSTRAINT "order_shipping_summaries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_shipping_summaries" ADD CONSTRAINT "order_shipping_summaries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "internal_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
