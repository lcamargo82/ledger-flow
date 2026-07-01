-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "providerStatus" TEXT,
ADD COLUMN     "providerUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "gateway_customer_references" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "gatewayConfigurationId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_customer_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gateway_customer_references_tenantId_idx" ON "gateway_customer_references"("tenantId");

-- CreateIndex
CREATE INDEX "gateway_customer_references_customerId_idx" ON "gateway_customer_references"("customerId");

-- CreateIndex
CREATE INDEX "gateway_customer_references_gatewayConfigurationId_idx" ON "gateway_customer_references"("gatewayConfigurationId");

-- CreateIndex
CREATE INDEX "gateway_customer_references_provider_providerCustomerId_idx" ON "gateway_customer_references"("provider", "providerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_customer_references_gatewayConfigurationId_customer_key" ON "gateway_customer_references"("gatewayConfigurationId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_customer_references_gatewayConfigurationId_provider_key" ON "gateway_customer_references"("gatewayConfigurationId", "providerCustomerId");

-- AddForeignKey
ALTER TABLE "gateway_customer_references" ADD CONSTRAINT "gateway_customer_references_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_customer_references" ADD CONSTRAINT "gateway_customer_references_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_customer_references" ADD CONSTRAINT "gateway_customer_references_gatewayConfigurationId_fkey" FOREIGN KEY ("gatewayConfigurationId") REFERENCES "gateway_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
