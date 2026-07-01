-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('ASAAS');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "webhook_inbox_events" (
    "id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "tenantId" TEXT,
    "paymentId" TEXT,
    "gatewayConfigurationId" TEXT,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "payloadHash" TEXT NOT NULL,
    "payloadSummary" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_inbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_inbox_events_provider_idx" ON "webhook_inbox_events"("provider");

-- CreateIndex
CREATE INDEX "webhook_inbox_events_eventType_idx" ON "webhook_inbox_events"("eventType");

-- CreateIndex
CREATE INDEX "webhook_inbox_events_status_idx" ON "webhook_inbox_events"("status");

-- CreateIndex
CREATE INDEX "webhook_inbox_events_tenantId_idx" ON "webhook_inbox_events"("tenantId");

-- CreateIndex
CREATE INDEX "webhook_inbox_events_paymentId_idx" ON "webhook_inbox_events"("paymentId");

-- CreateIndex
CREATE INDEX "webhook_inbox_events_gatewayConfigurationId_idx" ON "webhook_inbox_events"("gatewayConfigurationId");

-- CreateIndex
CREATE INDEX "webhook_inbox_events_receivedAt_idx" ON "webhook_inbox_events"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_inbox_events_provider_providerEventId_key" ON "webhook_inbox_events"("provider", "providerEventId");

-- AddForeignKey
ALTER TABLE "webhook_inbox_events" ADD CONSTRAINT "webhook_inbox_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_inbox_events" ADD CONSTRAINT "webhook_inbox_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_inbox_events" ADD CONSTRAINT "webhook_inbox_events_gatewayConfigurationId_fkey" FOREIGN KEY ("gatewayConfigurationId") REFERENCES "gateway_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
