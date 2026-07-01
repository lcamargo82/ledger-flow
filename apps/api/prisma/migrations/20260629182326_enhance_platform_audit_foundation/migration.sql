/*
  Warnings:

  - You are about to drop the `tenant_admin_invitations` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'PLATFORM_ADMIN', 'SYSTEM', 'WEBHOOK', 'WORKER');

-- DropForeignKey
ALTER TABLE "tenant_admin_invitations" DROP CONSTRAINT "tenant_admin_invitations_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_admin_invitations" DROP CONSTRAINT "tenant_admin_invitations_userId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actorType" "AuditActorType",
ADD COLUMN     "scope" "PermissionScope",
ADD COLUMN     "severity" "AuditSeverity",
ADD COLUMN     "source" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "traceId" TEXT;

-- DropTable
DROP TABLE "tenant_admin_invitations";

-- DropEnum
DROP TYPE "TenantInvitationStatus";

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_actorType_idx" ON "audit_logs"("actorType");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");
