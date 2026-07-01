/*
  Warnings:

  - The `provider` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'ASAAS', 'MERCADO_PAGO', 'PAGBANK', 'PAGARME');

-- CreateEnum
CREATE TYPE "GatewayEnvironment" AS ENUM ('SANDBOX', 'TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "GatewayConfigurationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "GatewayHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNHEALTHY');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gatewayConfigurationId" TEXT,
DROP COLUMN "provider",
ADD COLUMN     "provider" "PaymentProvider";

-- CreateTable
CREATE TABLE "gateway_configurations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "environment" "GatewayEnvironment" NOT NULL,
    "status" "GatewayConfigurationStatus" NOT NULL DEFAULT 'INACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "displayName" TEXT,
    "supportedMethods" JSONB,
    "encryptedCredentials" TEXT,
    "credentialsFingerprint" TEXT,
    "healthStatus" "GatewayHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthCheckMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gateway_configurations_tenantId_idx" ON "gateway_configurations"("tenantId");

-- CreateIndex
CREATE INDEX "gateway_configurations_tenantId_status_idx" ON "gateway_configurations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "gateway_configurations_tenantId_provider_idx" ON "gateway_configurations"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "gateway_configurations_tenantId_priority_idx" ON "gateway_configurations"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "gateway_configurations_provider_environment_idx" ON "gateway_configurations"("provider", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_configurations_tenantId_provider_environment_key" ON "gateway_configurations"("tenantId", "provider", "environment");

-- CreateIndex
CREATE INDEX "payments_provider_providerPaymentId_idx" ON "payments"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "payments_gatewayConfigurationId_idx" ON "payments"("gatewayConfigurationId");

-- AddForeignKey
ALTER TABLE "gateway_configurations" ADD CONSTRAINT "gateway_configurations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_gatewayConfigurationId_fkey" FOREIGN KEY ("gatewayConfigurationId") REFERENCES "gateway_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
