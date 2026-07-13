-- CreateEnum
CREATE TYPE "OperationalFinancialAccountStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CashLedgerEntryType" AS ENUM ('OPENING_BALANCE', 'MANUAL_ADJUSTMENT', 'SETTLEMENT_CREDIT', 'SETTLEMENT_DEBIT', 'PAYOUT', 'REFUND', 'FEE');

-- CreateEnum
CREATE TYPE "CashPositionAdjustmentType" AS ENUM ('OPENING_BALANCE', 'MANUAL_CORRECTION');

-- CreateTable
CREATE TABLE "operational_financial_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "gateway_configuration_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "environment" "GatewayEnvironment" NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "currency_exponent" INTEGER NOT NULL DEFAULT 2,
    "status" "OperationalFinancialAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "opening_balance_minor" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "current_balance_minor" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "operational_financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_ledger_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "type" "CashLedgerEntryType" NOT NULL,
    "amount_minor" DECIMAL(18,0) NOT NULL,
    "balance_after_minor" DECIMAL(18,0) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "currency_exponent" INTEGER NOT NULL DEFAULT 2,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_position_adjustments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "cash_ledger_entry_id" TEXT NOT NULL,
    "type" "CashPositionAdjustmentType" NOT NULL,
    "amount_minor" DECIMAL(18,0) NOT NULL,
    "reason_code" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_position_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_financial_accounts_tenant_id_name_key" ON "operational_financial_accounts"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "operational_financial_accounts_tenant_id_provider_status_idx" ON "operational_financial_accounts"("tenant_id", "provider", "status");

-- CreateIndex
CREATE INDEX "operational_financial_accounts_tenant_id_gateway_configuration_id_idx" ON "operational_financial_accounts"("tenant_id", "gateway_configuration_id");

-- CreateIndex
CREATE INDEX "operational_financial_accounts_tenant_id_created_at_idx" ON "operational_financial_accounts"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cash_ledger_entries_tenant_id_idempotency_key_key" ON "cash_ledger_entries"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "cash_ledger_entries_tenant_id_account_id_occurred_at_idx" ON "cash_ledger_entries"("tenant_id", "account_id", "occurred_at");

-- CreateIndex
CREATE INDEX "cash_ledger_entries_tenant_id_type_idx" ON "cash_ledger_entries"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "cash_ledger_entries_source_type_source_id_idx" ON "cash_ledger_entries"("source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_position_adjustments_cash_ledger_entry_id_key" ON "cash_position_adjustments"("cash_ledger_entry_id");

-- CreateIndex
CREATE INDEX "cash_position_adjustments_tenant_id_account_id_created_at_idx" ON "cash_position_adjustments"("tenant_id", "account_id", "created_at");

-- CreateIndex
CREATE INDEX "cash_position_adjustments_tenant_id_type_idx" ON "cash_position_adjustments"("tenant_id", "type");

-- AddForeignKey
ALTER TABLE "operational_financial_accounts" ADD CONSTRAINT "operational_financial_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_financial_accounts" ADD CONSTRAINT "operational_financial_accounts_gateway_configuration_id_fkey" FOREIGN KEY ("gateway_configuration_id") REFERENCES "gateway_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_financial_accounts" ADD CONSTRAINT "operational_financial_accounts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_ledger_entries" ADD CONSTRAINT "cash_ledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_ledger_entries" ADD CONSTRAINT "cash_ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "operational_financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_ledger_entries" ADD CONSTRAINT "cash_ledger_entries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_position_adjustments" ADD CONSTRAINT "cash_position_adjustments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_position_adjustments" ADD CONSTRAINT "cash_position_adjustments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "operational_financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_position_adjustments" ADD CONSTRAINT "cash_position_adjustments_cash_ledger_entry_id_fkey" FOREIGN KEY ("cash_ledger_entry_id") REFERENCES "cash_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_position_adjustments" ADD CONSTRAINT "cash_position_adjustments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
