-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('TENANT', 'PLATFORM');

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "scope" "PermissionScope" NOT NULL DEFAULT 'TENANT';
