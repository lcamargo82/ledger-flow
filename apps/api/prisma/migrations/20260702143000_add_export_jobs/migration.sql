-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExportJobFormat" AS ENUM ('CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "ExportJobType" AS ENUM ('ORDER_FINANCIAL_FACTS', 'CATALOG_PRODUCTS');

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT,
    "type" "ExportJobType" NOT NULL,
    "format" "ExportJobFormat" NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "parameters_json" JSONB,
    "file_path" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_summary" TEXT,
    "expires_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_jobs_tenant_id_status_idx" ON "export_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "export_jobs_tenant_id_created_at_idx" ON "export_jobs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "export_jobs_tenant_id_type_idx" ON "export_jobs"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "export_jobs_expires_at_idx" ON "export_jobs"("expires_at");

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
