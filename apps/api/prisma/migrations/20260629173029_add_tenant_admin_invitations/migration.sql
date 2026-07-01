-- CreateEnum
CREATE TYPE "TenantInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

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

-- AddForeignKey
ALTER TABLE "tenant_admin_invitations" ADD CONSTRAINT "tenant_admin_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_admin_invitations" ADD CONSTRAINT "tenant_admin_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
