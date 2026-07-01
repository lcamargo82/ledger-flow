-- CreateIndex
CREATE INDEX "webhook_inbox_events_providerPaymentId_idx" ON "webhook_inbox_events"("providerPaymentId");

-- CreateIndex
CREATE INDEX "webhook_inbox_events_externalReference_idx" ON "webhook_inbox_events"("externalReference");
