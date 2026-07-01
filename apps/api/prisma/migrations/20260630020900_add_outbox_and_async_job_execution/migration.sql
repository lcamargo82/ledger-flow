-- CreateEnum
CREATE TYPE "TenantInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AsyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'RETRY_SCHEDULED', 'DEAD_LETTERED', 'FAILED');

-- CreateTable
CREATE TABLE "tenant_admin_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "TenantInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "publishAttempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorSummary" TEXT,
    "traceId" TEXT,
    "replayOfEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "async_job_executions" (
    "id" TEXT NOT NULL,
    "outboxEventId" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "tenantId" TEXT,
    "status" "AsyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorSummary" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "async_job_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_admin_invitations_tokenHash_key" ON "tenant_admin_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "tenant_admin_invitations_tenantId_idx" ON "tenant_admin_invitations"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_admin_invitations_userId_idx" ON "tenant_admin_invitations"("userId");

-- CreateIndex
CREATE INDEX "tenant_admin_invitations_email_idx" ON "tenant_admin_invitations"("email");

-- CreateIndex
CREATE INDEX "tenant_admin_invitations_status_idx" ON "tenant_admin_invitations"("status");

-- CreateIndex
CREATE INDEX "tenant_admin_invitations_expiresAt_idx" ON "tenant_admin_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "tenant_admin_invitations_createdAt_idx" ON "tenant_admin_invitations"("createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_status_availableAt_idx" ON "outbox_events"("status", "availableAt");

-- CreateIndex
CREATE INDEX "outbox_events_tenantId_createdAt_idx" ON "outbox_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_eventType_status_idx" ON "outbox_events"("eventType", "status");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateType_aggregateId_idx" ON "outbox_events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "outbox_events_traceId_idx" ON "outbox_events"("traceId");

-- CreateIndex
CREATE INDEX "outbox_events_replayOfEventId_idx" ON "outbox_events"("replayOfEventId");

-- CreateIndex
CREATE INDEX "async_job_executions_status_nextRetryAt_idx" ON "async_job_executions"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "async_job_executions_tenantId_status_idx" ON "async_job_executions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "async_job_executions_traceId_idx" ON "async_job_executions"("traceId");

-- CreateIndex
CREATE UNIQUE INDEX "async_job_executions_outboxEventId_consumerName_key" ON "async_job_executions"("outboxEventId", "consumerName");

-- AddForeignKey
ALTER TABLE "tenant_admin_invitations" ADD CONSTRAINT "tenant_admin_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_admin_invitations" ADD CONSTRAINT "tenant_admin_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "async_job_executions" ADD CONSTRAINT "async_job_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
