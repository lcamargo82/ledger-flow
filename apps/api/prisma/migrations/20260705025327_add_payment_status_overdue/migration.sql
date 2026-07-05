-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'OVERDUE';

-- RenameIndex
ALTER INDEX "channel_listings_tenant_id_integration_id_external_listing_id_k" RENAME TO "channel_listings_tenant_id_integration_id_external_listing__key";

-- RenameIndex
ALTER INDEX "inventory_movements_tenant_id_sku_id_warehouse_id_occurred_at_i" RENAME TO "inventory_movements_tenant_id_sku_id_warehouse_id_occurred__idx";

-- RenameIndex
ALTER INDEX "order_financial_facts_tenant_id_channel_provider_calculated_at_" RENAME TO "order_financial_facts_tenant_id_channel_provider_calculated_idx";

-- RenameIndex
ALTER INDEX "reconciliation_policies_tenant_id_provider_currency_is_active_i" RENAME TO "reconciliation_policies_tenant_id_provider_currency_is_acti_idx";
